const {
  time,
  loadFixture,
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("NetXSwap", function () {
  async function deployNetXSwapFixture() {
    const [owner, user1, user2, triasNewHolder] = await ethers.getSigners();
    const triasNewTokenFactory = await ethers.getContractFactory("MockERC20");
    const netXTokenFactory = await ethers.getContractFactory("MockERC20");

    const triasNewToken = await triasNewTokenFactory.deploy("TriasNew", "TRIAS");
    const netXToken = await netXTokenFactory.deploy("NetX", "NETX");

    const startTime = (await time.latest()) + 60;
    const endTime = startTime + 3600;

    const NetXSwapFactory = await ethers.getContractFactory("NetXSwap");
    const netXSwap = await NetXSwapFactory.deploy(
      owner.address,
      triasNewToken.target,
      startTime,
      endTime
    );

    await netXSwap.connect(owner).setTokens(
      netXToken.target,
      ethers.ZeroAddress,
      ethers.ZeroAddress,
      ethers.ZeroAddress
    );

    await netXSwap.connect(owner).setVerifier(owner.address);
    await triasNewToken.connect(owner).mint(triasNewHolder.address, ethers.parseEther("1000"));
    await netXToken.connect(owner).mint(netXSwap.target, ethers.parseEther("1000"));

    return {
      netXSwap,
      triasNewToken,
      netXToken,
      owner,
      user1,
      user2,
      triasNewHolder,
      startTime,
      endTime
    };
  }

  // ---

  describe("Cross-chain Swap and Claim Process", function () {
    it("should sign sucesfully", async function () {
      const privateKey = process.env.PRIVATE_KEY;
      if (!privateKey) {
        throw new Error("PRIVATE_KEY not found in .env file");
      }

      // 创建 signer
      const provider = hre.ethers.provider; // 获取 Hardhat 的 provider（基于当前网络）
      const signer = new ethers.Wallet(privateKey, provider);

      const sourceChainId = 345;
      const claimNonce = 1; // First claim has a nonce of 0
      // const orderId = ethers.keccak256(ethers.toUtf8Bytes("test-order"));
      // console.log("Order ID:", orderId);
      const orderId = "0x5bafa7e8c231172c0b27052dc79cf931dc940a905e9f415c6bbe5fbbf8d3e387";
      console.log("Order ID:", orderId);

      const messageHash = ethers.solidityPackedKeccak256(
        ["address", "uint256", "uint256", "uint256", "address", "bytes32"],
        ["0xa6996496C1d32324755676cA3DaD167082BaE53c", "100000000000000000000", claimNonce, sourceChainId, "0xC156A1cac848D371A696888b9D41B7490c4F10d3", orderId]
      );

      // The verifier (owner) signs the message.
      const signature = await signer.signMessage(ethers.getBytes(messageHash));
      console.log("Signature:", signature);

    });
    it("Should complete the full swap and claim process from a non-BSC chain to BSC", async function () {
      const {
        netXSwap,
        triasNewToken,
        netXToken,
        owner,
        triasNewHolder,
        startTime,
      } = await loadFixture(deployNetXSwapFixture);

      await time.increaseTo(startTime + 1);

      const swapAmount = ethers.parseEther("1000");
      const initialUserBalance = await triasNewToken.balanceOf(triasNewHolder.address);

      // Step 1: User performs a swap on a non-BSC chain (e.g., Hardhat's default chain)
      // The `swapToNetX` call will transfer the tokens to the contract and emit an event.
      await triasNewToken
        .connect(triasNewHolder)
        .approve(netXSwap.target, swapAmount);

      const swapTx = await netXSwap.connect(triasNewHolder).swapToNetX(1);
      const swapReceipt = await swapTx.wait();

      // Check user's balance after the swap. It should be reduced by the swap amount.
      expect(await triasNewToken.balanceOf(triasNewHolder.address)).to.equal(
        initialUserBalance - swapAmount
      );

      // Step 2: Simulate backend listening for the `SwapExecuted` event
      const swapEvent = swapReceipt.logs.find(
        (log) => log.topics[0] === netXSwap.interface.getEvent("SwapExecuted").topicHash
      );
      expect(swapEvent).to.exist;

      // Parse event data to get the user and amount.
      const decodedEvent = netXSwap.interface.decodeEventLog(
        "SwapExecuted",
        swapEvent.data,
        swapEvent.topics
      );

      const eventUser = decodedEvent.user;
      const eventAmount = decodedEvent.amountOut;

      expect(eventUser).to.equal(triasNewHolder.address);
      expect(eventAmount).to.equal(swapAmount);

      // Step 3: Simulate backend signing the message for the claim on BSC
      const bscChainId = 97; // Mock BSC chain ID
      const claimNonce = 0; // First claim has a nonce of 0

      const messageHash = ethers.solidityPackedKeccak256(
        ["address", "uint256", "uint256", "uint256", "address"],
        [eventUser, eventAmount, claimNonce, bscChainId, netXSwap.target]
      );

      // The verifier (owner) signs the message.
      const signature = await owner.signMessage(ethers.getBytes(messageHash));

      // Step 4: User switches to BSC and performs the claim
      const initialNetXBalance = await netXToken.balanceOf(triasNewHolder.address);

      // The `userClaim` function will now be called on the BSC network.
      await expect(
        netXSwap.connect(triasNewHolder).userClaim(eventAmount, bscChainId, signature)
      )
        .to.emit(netXSwap, "ClaimExecuted")
        .withArgs(triasNewHolder.address, bscChainId, eventAmount, 1);

      // Verify the user received the NetX tokens
      const finalNetXBalance = await netXToken.balanceOf(triasNewHolder.address);
      expect(finalNetXBalance).to.equal(initialNetXBalance + eventAmount);
    });
  });

  // ---

  describe("Ownership and Admin Functions", function () {
    it("Should allow the owner to set tokens", async function () {
      const {
        netXSwap,
        owner,
        user1
      } = await loadFixture(deployNetXSwapFixture);
      await expect(netXSwap.connect(user1).setTokens(
        user1.address,
        user1.address,
        user1.address,
        user1.address
      )).to.be.revertedWithCustomError(netXSwap, "OwnableUnauthorizedAccount");

      await netXSwap.connect(owner).setTokens(
        user1.address,
        user1.address,
        user1.address,
        user1.address
      );
      expect(await netXSwap.netXToken()).to.equal(user1.address);
      expect(await netXSwap.triasOldToken()).to.equal(user1.address);
      expect(await netXSwap.tHECOToken()).to.equal(user1.address);
      expect(await netXSwap.tToken()).to.equal(user1.address);
    });

    it("Should allow the owner to set the verifier address", async function () {
      const {
        netXSwap,
        owner,
        user1
      } = await loadFixture(deployNetXSwapFixture);
      // We set the verifier in the fixture, so we'll test updating it here
      await expect(netXSwap.connect(user1).setVerifier(user1.address))
        .to.be.revertedWithCustomError(netXSwap, "OwnableUnauthorizedAccount");

      await expect(netXSwap.connect(owner).setVerifier(user1.address))
        .to.emit(netXSwap, "VerifierUpdated")
        .withArgs(user1.address);
      expect(await netXSwap.verifyAddress()).to.equal(user1.address);
    });

    it("Should allow the owner to claim tokens from the contract", async function () {
      const {
        netXSwap,
        owner,
        triasNewToken,
        user1
      } = await loadFixture(deployNetXSwapFixture);
      const depositAmount = ethers.parseEther("50");
      await triasNewToken.connect(owner).mint(netXSwap.target, depositAmount);
      expect(await triasNewToken.balanceOf(netXSwap.target)).to.equal(
        depositAmount
      );
      await netXSwap.connect(owner).claimTokens(triasNewToken.target, user1.address);
      expect(await triasNewToken.balanceOf(netXSwap.target)).to.equal(0);
      expect(await triasNewToken.balanceOf(user1.address)).to.equal(
        depositAmount
      );
    });
  });
});