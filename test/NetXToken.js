const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("NetXToken", function () {
  // Fixture to deploy the NetXToken contract
  async function deployNetXTokenFixture() {
    const INITIAL_MINT = ethers.parseEther("20000000");
    const TOTAL_SUPPLY = ethers.parseEther("50000000");

    // Get signers
    const [owner,spender, otherAccount] = await ethers.getSigners();

    // Deploy the NetXToken contract
    const NetXToken = await ethers.getContractFactory("NetXToken");
    const netXToken = await NetXToken.deploy(owner.address);
    await netXToken.waitForDeployment();

    return { netXToken, INITIAL_MINT, TOTAL_SUPPLY, owner, spender,otherAccount };
  }

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      const { netXToken, owner } = await loadFixture(deployNetXTokenFixture);
      expect(await netXToken.owner()).to.equal(owner.address);
    });

    it("Should mint the initial supply to the owner", async function () {
      const { netXToken, INITIAL_MINT, owner } = await loadFixture(deployNetXTokenFixture);
      expect(await netXToken.balanceOf(owner.address)).to.equal(INITIAL_MINT);
      expect(await netXToken.totalMinted()).to.equal(INITIAL_MINT);
    });

    it("Should set the correct total supply cap", async function () {
      const { netXToken, TOTAL_SUPPLY } = await loadFixture(deployNetXTokenFixture);
      expect(await netXToken.TOTAL_SUPPLY()).to.equal(TOTAL_SUPPLY);
    });
  });

  describe("Minting", function () {
    describe("Validations", function () {
      it("Should allow owner to mint tokens", async function () {
        const { netXToken, owner, otherAccount } = await loadFixture(deployNetXTokenFixture);
        const mintAmount = ethers.parseEther("1000");
        await expect(netXToken.connect(owner).mint(otherAccount.address, mintAmount))
          .to.emit(netXToken, "Mint")
          .withArgs(otherAccount.address, mintAmount);
        expect(await netXToken.balanceOf(otherAccount.address)).to.equal(mintAmount);
      });

      it("Should revert if non-owner tries to mint", async function () {
        const { netXToken, otherAccount } = await loadFixture(deployNetXTokenFixture);
        const mintAmount = ethers.parseEther("1000");
        await expect(
          netXToken.connect(otherAccount).mint(otherAccount.address, mintAmount)
        ).to.be.revertedWithCustomError(netXToken, "OwnableUnauthorizedAccount")
         .withArgs(otherAccount.address);
      });
    });

    describe("Events", function () {
      it("Should emit Mint event on successful mint", async function () {
        const { netXToken, owner, otherAccount } = await loadFixture(deployNetXTokenFixture);
        const mintAmount = ethers.parseEther("1000");
        await expect(netXToken.connect(owner).mint(otherAccount.address, mintAmount))
          .to.emit(netXToken, "Mint")
          .withArgs(otherAccount.address, mintAmount);
      });
    });
  });

  describe("Burning", function () {
    describe("Validations", function () {
      it("Should allow owner to burn tokens", async function () {
        const { netXToken, owner, INITIAL_MINT } = await loadFixture(deployNetXTokenFixture);
        const burnAmount = ethers.parseEther("1000");
        await expect(netXToken.connect(owner).burn(burnAmount))
          .to.emit(netXToken, "Burn")
          .withArgs(owner.address, burnAmount);
        expect(await netXToken.balanceOf(owner.address)).to.equal(INITIAL_MINT - burnAmount);
      });

      it("Should revert if non-owner tries to burn", async function () {
        const { netXToken, otherAccount } = await loadFixture(deployNetXTokenFixture);
        const burnAmount = ethers.parseEther("1000");
        await expect(
          netXToken.connect(otherAccount).burn(burnAmount)
        ).to.be.revertedWithCustomError(netXToken, "OwnableUnauthorizedAccount")
         .withArgs(otherAccount.address);
      });
    });

    describe("Events", function () {
      it("Should emit Burn event on successful burn", async function () {
        const { netXToken, owner } = await loadFixture(deployNetXTokenFixture);
        const burnAmount = ethers.parseEther("1000");
        await expect(netXToken.connect(owner).burn(burnAmount))
          .to.emit(netXToken, "Burn")
          .withArgs(owner.address, burnAmount);
      });
    });
  });

  describe("Permit Cancellation", function () {
    it("Should allow owner to cancel permit and increment nonce", async function () {
      const { netXToken, owner } = await loadFixture(deployNetXTokenFixture);
      const initialNonce = await netXToken.nonces(owner.address);
      await expect(netXToken.connect(owner).cancelPermit())
        .to.emit(netXToken, "PermitCancelled")
        .withArgs(owner.address, initialNonce);
      expect(await netXToken.nonces(owner.address)).to.equal(initialNonce + BigInt(1));
    });

    it("Should allow non-owner to cancel permit and increment nonce", async function () {
      const { netXToken, otherAccount } = await loadFixture(deployNetXTokenFixture);
      const initialNonce = await netXToken.nonces(otherAccount.address);
      await expect(netXToken.connect(otherAccount).cancelPermit())
        .to.emit(netXToken, "PermitCancelled")
        .withArgs(otherAccount.address, initialNonce);
      expect(await netXToken.nonces(otherAccount.address)).to.equal(initialNonce + BigInt(1));
    });
  });

  describe("Permit", function () {
    it("Should allow owner to authorize spender via permit", async function () {
      const { netXToken, owner, spender } = await loadFixture(deployNetXTokenFixture);
      const value = ethers.parseEther("1000");
      const deadline = (await ethers.provider.getBlock("latest")).timestamp + 3600; // 1 hour from now
      const nonce = await netXToken.nonces(owner.address);

      // EIP-712 domain data
      const domain = {
        // name: "NetX Token",
        name: await netXToken.name(),
        version: "1",
        chainId: await ethers.provider.getNetwork().then((n) => n.chainId),
        verifyingContract: netXToken.target,
      };

      // EIP-712 types
      const types = {
        Permit: [
          { name: "owner", type: "address" },
          { name: "spender", type: "address" },
          { name: "value", type: "uint256" },
          { name: "nonce", type: "uint256" },
          { name: "deadline", type: "uint256" },
        ],
      };

      // EIP-712 message
      const message = {
        owner: owner.address,
        spender: spender.address,
        value: value,
        nonce: nonce,
        deadline: deadline,
      };

      // Generate signature
      const signature = await owner.signTypedData(domain, types, message);
      const { v, r, s } = ethers.Signature.from(signature);

      // Call permit
      await expect(
        netXToken.permit(owner.address, spender.address, value, deadline, v, r, s)
      )
        .to.emit(netXToken, "Approval")
        .withArgs(owner.address, spender.address, value);

      // Verify allowance and nonce
      expect(await netXToken.allowance(owner.address, spender.address)).to.equal(value);
      expect(await netXToken.nonces(owner.address)).to.equal(nonce + BigInt(1));
    });

    it("Should revert if signature is invalid", async function () {
      const { netXToken, owner, spender, otherAccount } = await loadFixture(deployNetXTokenFixture);
      const value = ethers.parseEther("1000");
      const deadline = (await ethers.provider.getBlock("latest")).timestamp + 3600;
      const nonce = await netXToken.nonces(owner.address);

      // EIP-712 domain data (with incorrect name to create invalid signature)
      const domain = {
        name: "Wrong Token", // Intentionally wrong
        version: "1",
        chainId: await ethers.provider.getNetwork().then((n) => n.chainId),
        verifyingContract: netXToken.target,
      };

      const types = {
        Permit: [
          { name: "owner", type: "address" },
          { name: "spender", type: "address" },
          { name: "value", type: "uint256" },
          { name: "nonce", type: "uint256" },
          { name: "deadline", type: "uint256" },
        ],
      };

      const message = {
        owner: owner.address,
        spender: spender.address,
        value: value,
        nonce: nonce,
        deadline: deadline,
      };

      // Generate invalid signature
      const signature = await owner.signTypedData(domain, types, message);
      const { v, r, s } = ethers.Signature.from(signature);

      // Expect permit to revert with InvalidSigner
      await expect(
        netXToken.permit(owner.address, spender.address, value, deadline, v, r, s)
      ).to.be.revertedWithCustomError(netXToken, "ERC2612InvalidSigner");
    });

    it("Should revert if deadline is expired", async function () {
      const { netXToken, owner, spender } = await loadFixture(deployNetXTokenFixture);
      const value = ethers.parseEther("1000");
      const deadline = (await ethers.provider.getBlock("latest")).timestamp - 3600; // Expired
      const nonce = await netXToken.nonces(owner.address);

      const domain = {
        name: "NetX Token",
        version: "1",
        chainId: await ethers.provider.getNetwork().then((n) => n.chainId),
        verifyingContract: netXToken.target,
      };

      const types = {
        Permit: [
          { name: "owner", type: "address" },
          { name: "spender", type: "address" },
          { name: "value", type: "uint256" },
          { name: "nonce", type: "uint256" },
          { name: "deadline", type: "uint256" },
        ],
      };

      const message = {
        owner: owner.address,
        spender: spender.address,
        value: value,
        nonce: nonce,
        deadline: deadline,
      };

      const signature = await owner.signTypedData(domain, types, message);
      const { v, r, s } = ethers.Signature.from(signature);

      await expect(
        netXToken.permit(owner.address, spender.address, value, deadline, v, r, s)
      ).to.be.revertedWithCustomError(netXToken, "ERC2612ExpiredSignature");
    });

    it("Should allow spender to transfer tokens after permit", async function () {
      const { netXToken, owner, spender, otherAccount } = await loadFixture(deployNetXTokenFixture);
      const value = ethers.parseEther("1000");
      const deadline = (await ethers.provider.getBlock("latest")).timestamp + 3600;
      const nonce = await netXToken.nonces(owner.address);

      const domain = {
        name: "NetX Token",
        version: "1",
        chainId: await ethers.provider.getNetwork().then((n) => n.chainId),
        verifyingContract: netXToken.target,
      };

      const types = {
        Permit: [
          { name: "owner", type: "address" },
          { name: "spender", type: "address" },
          { name: "value", type: "uint256" },
          { name: "nonce", type: "uint256" },
          { name: "deadline", type: "uint256" },
        ],
      };

      const message = {
        owner: owner.address,
        spender: spender.address,
        value: value,
        nonce: nonce,
        deadline: deadline,
      };

      const signature = await owner.signTypedData(domain, types, message);
      const { v, r, s } = ethers.Signature.from(signature);

      await netXToken.permit(owner.address, spender.address, value, deadline, v, r, s);

      // Spender transfers tokens to otherAccount
      await expect(
        netXToken.connect(spender).transferFrom(owner.address, otherAccount.address, value)
      )
        .to.emit(netXToken, "Transfer")
        .withArgs(owner.address, otherAccount.address, value);

      expect(await netXToken.balanceOf(otherAccount.address)).to.equal(value);
      expect(await netXToken.allowance(owner.address, spender.address)).to.equal(0);
    });

    it("Should invalidate permit signature after cancelPermit", async function () {
      const { netXToken, owner, spender } = await loadFixture(deployNetXTokenFixture);
      const value = ethers.parseEther("1000");
      const deadline = (await ethers.provider.getBlock("latest")).timestamp + 3600;
      const nonce = await netXToken.nonces(owner.address);

      // Generate valid signature
      const domain = {
        name: "NetX Token",
        version: "1",
        chainId: await ethers.provider.getNetwork().then((n) => n.chainId),
        verifyingContract: netXToken.target,
      };

      const types = {
        Permit: [
          { name: "owner", type: "address" },
          { name: "spender", type: "address" },
          { name: "value", type: "uint256" },
          { name: "nonce", type: "uint256" },
          { name: "deadline", type: "uint256" },
        ],
      };

      const message = {
        owner: owner.address,
        spender: spender.address,
        value: value,
        nonce: nonce,
        deadline: deadline,
      };

      const signature = await owner.signTypedData(domain, types, message);
      const { v, r, s } = ethers.Signature.from(signature);

      // Call cancelPermit to invalidate the signature
      await netXToken.connect(owner).cancelPermit();

      // Verify nonce has incremented
      expect(await netXToken.nonces(owner.address)).to.equal(nonce + BigInt(1));

      // Attempt to use the old signature
      await expect(
        netXToken.permit(owner.address, spender.address, value, deadline, v, r, s)
      ).to.be.revertedWithCustomError(netXToken, "ERC2612InvalidSigner");
    });
  });
});