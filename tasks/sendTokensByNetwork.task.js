
// tasks/sendTokensByNetwork.js
// const { task } = require("hardhat/config");
const { ethers } = require("hardhat");
const { tokenConfig } = require("../drop.config");

task("sendTokensByNetwork", "Send fixed amount of tokens based on the current network")
    .addParam("account", "receiver's address")
    .setAction(async (taskArgs, hre) => {
        const { account } = taskArgs.account;
        const networkName = hre.network.name;

        // 从配置文件获取当前网络的 token 列表
        const tokenAddresses = tokenConfig[networkName];
        if (!tokenAddresses || tokenAddresses.length === 0) {
            throw new Error(`No tokens configured for network: ${networkName}`);
        }

        // 从 .env 获取私钥
        const privateKey = process.env.PRIVATE_KEY;
        if (!privateKey) {
            throw new Error("PRIVATE_KEY not found in .env file");
        }

        // 创建 signer
        const provider = hre.ethers.provider; // 获取 Hardhat 的 provider（基于当前网络）
        const signer = new ethers.Wallet(privateKey, provider);
        console.log(`Sending from address: ${signer.address} on network: ${networkName}`);

        // 遍历每个 token 并发送
        for (const tokenAddress of tokenAddresses) {
            try {
                // 连接到 ERC20 合约
                const tokenContract = await ethers.getContractAt("IERC20", tokenAddress, signer);

                // 获取 decimals
                const decimals = await tokenContract.decimals();
                const parsedAmount = ethers.utils.parseUnits(1000, decimals);

                // 检查余额
                const balance = await tokenContract.balanceOf(signer.address);
                if (balance.lt(parsedAmount)) {
                    console.log(`Insufficient balance for token ${tokenAddress}. Balance: ${ethers.utils.formatUnits(balance, decimals)}`);
                    continue;
                }

                // 执行 transfer
                console.log(`Sending ${amount} of token ${tokenAddress} account ${account}`);
                const tx = await tokenContract.transfer(account, parsedAmount);
                await tx.wait();

                console.log(`Successfully sent ${amount} of token ${tokenAddress}. Tx hash: ${tx.hash}`);
            } catch (error) {
                console.error(`Failed account send token ${tokenAddress}:`, error.message);
            }
        }
    });