// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract NetXSwap is Ownable {
    address public netXToken;

    // Zone1
    address public triasNewToken;
    address public triasOldToken;
    address public tHECOToken;
    address public tToken;

    uint32 public triasRate = 1; // 1 TRIAS = 1 NetX
    uint32 public tHECORate = 1; // 1 tHECO = 1 NetX
    uint32 public tTokenRate = 1; // 1 tToken = 1 NetX

    bool public openSwap ;

    constructor(
        address _initialOwner,
        address _netXToken
    ) Ownable(_initialOwner) {
        netXToken = _netXToken;
        openSwap = true;
    }

    modifier onlyWhenSwapOpen() {
        require(openSwap, "Swap is not open");
        _;
    }

    function swapTriasToNetX() external onlyWhenSwapOpen {
        require(triasNewToken !=address(0), "No Token Exist On Chain");
        uint256 amount = IERC20(triasNewToken).balanceOf(msg.sender);
        require(amount > 0, "Amount must be greater than zero");
        // Transfer TRIAS from sender to this contract
        IERC20(triasNewToken).transferFrom(msg.sender, address(this), amount);
        // Transfer NetX tokens to the sender
        IERC20(netXToken).transfer(msg.sender, amount * triasRate / 1000);
    }

    function swapOldTriasToNetX() external onlyWhenSwapOpen{
        require(triasOldToken !=address(0), "No Token Exist On Chain");
        uint256 amount = IERC20(triasOldToken).balanceOf(msg.sender);
        require(amount > 0, "Amount must be greater than zero");
        // Transfer old TRIAS from sender to this contract
        IERC20(triasOldToken).transferFrom(msg.sender, address(this), amount);
        // Transfer NetX tokens to the sender
        IERC20(netXToken).transfer(msg.sender, amount * triasRate / 1000);
    }

    function swapTHECOToNetX() external onlyWhenSwapOpen{
        require(tHECOToken !=address(0), "No Token Exist On Chain");
        uint256 amount = IERC20(tHECOToken).balanceOf(msg.sender);
        require(amount > 0, "Amount must be greater than zero");
        // Transfer tHECO from sender to this contract
        IERC20(tHECOToken).transferFrom(msg.sender, address(this), amount);
        // Transfer NetX tokens to the sender
        IERC20(netXToken).transfer(msg.sender, amount * tHECORate / 1000);
    }

    function swapTTokenToNetX() external onlyWhenSwapOpen{
        require(tToken !=address(0), "No Token Exist On Chain");
        uint256 amount = IERC20(tToken).balanceOf(msg.sender);
        require(amount > 0, "Amount must be greater than zero");
        // Transfer tToken from sender to this contract
        IERC20(tToken).transferFrom(msg.sender, address(this), amount);
        // Transfer NetX tokens to the sender
        IERC20(netXToken).transfer(msg.sender, amount * tTokenRate / 1000);
    }

    function setnetXToken(address _netXToken) external onlyOwner {
        require(_netXToken != address(0), "Invalid NetX token address");
        netXToken = _netXToken;
    }

    function claimTokens(address _token,address _receiver) external onlyOwner {
        uint256 balance = IERC20(_token).balanceOf(address(this));
        require(balance > 0, "No tokens to claim");
        IERC20(_token).transfer(_receiver, balance);
    }

    function setSwapStatus(bool _status) external onlyOwner {
        openSwap = _status;
    }

}
