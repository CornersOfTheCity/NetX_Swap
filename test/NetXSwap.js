// SPDX-License-Identifier: MIT
const {
  time,
  loadFixture,
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("NetXSwap", function () {
  // We define a fixture to reuse the same setup in every test.
  async function deployNetXSwapFixture() {
    const [owner, user, anotherUser] = await ethers.getSigners();

    // 代币合约工厂
    const NetXTokenFactory = await ethers.getContractFactory("NetXToken");
    const TriasNewTokenFactory = await ethers.getContractFactory("TRIAS");
    const TriasOldTokenFactory = await ethers.getContractFactory("TriasOnBSC");
    const THECOTokenFactory = await ethers.getContractFactory("THECO");
    const TTokenFactory = await ethers.getContractFactory("TTOKEN");

    // 部署代币合约
    const netXToken = await NetXTokenFactory.deploy(owner.address);
    const triasNewToken = await TriasNewTokenFactory.deploy(owner.address);
    const triasOldToken = await TriasOldTokenFactory.deploy("Trias Token", "TRIAS", 10000);
    const tHECOToken = await THECOTokenFactory.deploy();
    const tToken = await TTokenFactory.deploy();

    // 部署 NetXSwap 合约
    const NetXSwap = await ethers.getContractFactory("NetXSwap");
    const netXSwap = await NetXSwap.deploy(owner.address, netXToken.target);

    // // 铸造一些代币给 NetXSwap 合约和用户
    // const MINT_AMOUNT = ethers.parseEther("10000");
    // await netXToken.mint(netXSwap.target, MINT_AMOUNT);

    // await triasNewToken.mint(user.address, ethers.parseEther("1000"));
    // await triasOldToken.mint(user.address, ethers.parseEther("1000"));
    // await tHECOToken.mint(user.address, ethers.parseEther("1000"));
    // await tToken.mint(user.address, ethers.parseEther("1000"));

    // 设置 NetXSwap 合约中的可交换代币地址
    await netXSwap.setTokens(
      triasNewToken.target,
      triasOldToken.target,
      tHECOToken.target,
      tToken.target
    );

    return {
      netXSwap,
      netXToken,
      triasNewToken,
      triasOldToken,
      tHECOToken,
      tToken,
      owner,
      user,
      anotherUser,
    };
  }


  describe("Deployment", function () {
    it("应该正确设置所有者", async function () {
      const { netXSwap, owner } = await loadFixture(deployNetXSwapFixture);
      expect(await netXSwap.owner()).to.equal(owner.address);
    });

    it("应该正确设置 NetX 代币地址", async function () {
      const { netXSwap, netXToken } = await loadFixture(
        deployNetXSwapFixture
      );
      expect(await netXSwap.netXToken()).to.equal(netXToken.target);
    });

    it("应该正确设置所有可交换代币地址", async function () {
      const { netXSwap, triasNewToken, triasOldToken, tHECOToken, tToken } =
        await loadFixture(deployNetXSwapFixture);

      expect(await netXSwap.triasNewToken()).to.equal(triasNewToken.target);
      expect(await netXSwap.triasOldToken()).to.equal(triasOldToken.target);
      expect(await netXSwap.tHECOToken()).to.equal(tHECOToken.target);
      expect(await netXSwap.tToken()).to.equal(tToken.target);
    });

    it("初始时交换功能应为关闭状态", async function () {
      const { netXSwap } = await loadFixture(deployNetXSwapFixture);
      expect(await netXSwap.openSwap()).to.be.false;
    });
  });

  describe("管理功能", function () {
    it("所有者应该能够设置交换状态", async function () {
      const { netXSwap } = await loadFixture(deployNetXSwapFixture);
      await netXSwap.setSwapStatus(true);
      expect(await netXSwap.openSwap()).to.be.true;
    });

    it("非所有者不能设置交换状态", async function () {
      const { netXSwap, anotherUser } = await loadFixture(
        deployNetXSwapFixture
      );
      await expect(
        netXSwap.connect(anotherUser).setSwapStatus(true)
      ).to.be.revertedWithCustomError(netXSwap, "OwnableUnauthorizedAccount");
    });

    it("所有者应该能够从合约中取出代币", async function () {
      const { netXSwap, netXToken, owner } = await loadFixture(
        deployNetXSwapFixture
      );

      await netXToken.transfer(netXSwap.target, ethers.parseEther("1000"));
      const balanceBefore = await netXToken.balanceOf(owner.address);
      const contractBalance = await netXToken.balanceOf(netXSwap.target);

      await netXSwap.claimTokens(netXToken.target, owner.address);

      expect(await netXToken.balanceOf(owner.address)).to.equal(
        balanceBefore + contractBalance
      );
    });
  });

  describe("代币交换 (swapToNetX)", function () {
    // Before each swap test, let's open the swap
    beforeEach(async function () {
      const { netXSwap } = await loadFixture(deployNetXSwapFixture);
      await netXSwap.setSwapStatus(true);
    });

    it("应该成功将 TriasNew 代币交换成 NetX", async function () {
      const { netXSwap, netXToken, triasNewToken, user } = await loadFixture(
        deployNetXSwapFixture
      );

      await triasNewToken.transfer(user.address, ethers.parseEther("1000"));
      await netXToken.transfer(netXSwap.target, ethers.parseEther("1000"));
      const userTriasNewBalance = await triasNewToken.balanceOf(user.address);
      const userNetXBalanceBefore = await netXToken.balanceOf(user.address);

      // 用户需要先授权
      await triasNewToken
        .connect(user)
        .approve(netXSwap.target, userTriasNewBalance);

      await netXSwap.setSwapStatus(true);
      await expect(netXSwap.connect(user).swapToNetX(1))
        .to.emit(netXSwap, "SwapExecuted")
        .withArgs(user.address, triasNewToken.target, userTriasNewBalance);

      const userNetXBalanceAfter = await netXToken.balanceOf(user.address);
      const contractTriasNewBalance = await triasNewToken.balanceOf(netXSwap.target);

      expect(userNetXBalanceAfter).to.equal(
        userNetXBalanceBefore + userTriasNewBalance
      );
      expect(contractTriasNewBalance).to.equal(userTriasNewBalance);
    });

    it("应该在交换功能关闭时失败", async function () {
      const { netXSwap, user } = await loadFixture(deployNetXSwapFixture);
      await netXSwap.setSwapStatus(false);
      await expect(netXSwap.connect(user).swapToNetX(1)).to.be.revertedWith(
        "Swap is not open"
      );
    });

    it("当用户余额不足时应该失败", async function () {
      const { netXSwap, triasNewToken, anotherUser } = await loadFixture(
        deployNetXSwapFixture
      );
      await netXSwap.setSwapStatus(true);
      // anotherUser 没有任何 triasNew 代币
      await expect(
        netXSwap.connect(anotherUser).swapToNetX(1)
      ).to.be.revertedWith("Trias New Token zero balance");
    });

    it("当合约中的 NetX 代币余额不足时应该失败", async function () {
      const { netXSwap, netXToken, triasNewToken, user, anotherUser } = await loadFixture(deployNetXSwapFixture);

      await netXSwap.setSwapStatus(true);
      await triasNewToken.transfer(user.address, ethers.parseEther("1000"));

      // 故意将合约的 NetX 代币余额耗尽
      const contractNetXBalance = await netXToken.balanceOf(netXSwap.target);
      await netXToken.transfer(anotherUser.address, contractNetXBalance);

      const userTriasNewBalance = await triasNewToken.balanceOf(user.address);
      await triasNewToken.connect(user).approve(netXSwap.target, userTriasNewBalance);

      await expect(netXSwap.connect(user).swapToNetX(1)).to.be.revertedWith(
        "Insufficient NetX balance"
      );
    });

    it("当用户未授权时应该失败", async function () {
      const { netXSwap, user } = await loadFixture(deployNetXSwapFixture);
      // 用户没有调用 approve
      await expect(netXSwap.connect(user).swapToNetX(0)).to.be.reverted;
    });

    it("应该能够处理所有四种代币类型", async function () {
      const { netXSwap, netXToken, triasNewToken, triasOldToken, tHECOToken, tToken, user } = await loadFixture(deployNetXSwapFixture);

      await netXSwap.setSwapStatus(true);
      await triasNewToken.transfer(user.address, ethers.parseEther("1000"));
      await triasOldToken.transfer(user.address, ethers.parseEther("1000"));
      await tHECOToken.transfer(user.address, ethers.parseEther("1000"));
      await tToken.transfer(user.address, ethers.parseEther("1000"));
      await netXToken.transfer(netXSwap.target, ethers.parseEther("4000"));

      const triasNewAmount = await triasNewToken.balanceOf(user.address);
      await triasNewToken.connect(user).approve(netXSwap.target, triasNewAmount);
      await expect(netXSwap.connect(user).swapToNetX(1)).to.not.be.reverted;

      const triasOldAmount = await triasOldToken.balanceOf(user.address);
      await triasOldToken.connect(user).approve(netXSwap.target, triasOldAmount);
      await expect(netXSwap.connect(user).swapToNetX(2)).to.not.be.reverted;

      const tHECOAmount = await tHECOToken.balanceOf(user.address);
      await tHECOToken.connect(user).approve(netXSwap.target, tHECOAmount);
      await expect(netXSwap.connect(user).swapToNetX(3)).to.not.be.reverted;

      const tAmount = await tToken.balanceOf(user.address);
      await tToken.connect(user).approve(netXSwap.target, tAmount);
      await expect(netXSwap.connect(user).swapToNetX(4)).to.not.be.reverted;
    });
  });
});