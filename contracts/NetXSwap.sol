// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract NetXSwap is Ownable, ReentrancyGuard {
    address public netXToken;

    // Zone1
    address public triasNewToken;
    address public triasOldToken;
    address public tHECOToken;
    address public tToken;

    uint256 public startTime;
    uint256 public endTime;

    enum TokenType {
        Zero,
        TriasNew,
        TriasOld,
        THECO,
        TToken
    }

    event SwapExecuted(
        address indexed user,
        address indexed tokenIn,
        uint256 amountOut
    );

    constructor(
        address _initialOwner,
        address _netXToken,
        uint256 _starttime,
        uint256 _endtime
    ) Ownable(_initialOwner) {
        netXToken = _netXToken;
        startTime = _starttime;
        endTime = _endtime;
    }

    modifier onlyWhenSwapOpen() {
        require(
            startTime <= block.timestamp && block.timestamp <= endTime,
            "Swap is not open"
        );
        _;
    }

    function swapToNetX(
        TokenType _tokenType
    ) external onlyWhenSwapOpen nonReentrant {
        address token;
        string memory tokenName;

        if (_tokenType == TokenType.TriasNew) {
            token = triasNewToken;
            tokenName = "Trias New Token";
        } else if (_tokenType == TokenType.TriasOld) {
            token = triasOldToken;
            tokenName = "Trias Old Token";
        } else if (_tokenType == TokenType.THECO) {
            token = tHECOToken;
            tokenName = "tHECO Token";
        } else if (_tokenType == TokenType.TToken) {
            token = tToken;
            tokenName = "tToken";
        } else {
            revert("Invalid token type");
        }

        require(
            token != address(0),
            string(abi.encodePacked(tokenName, " not set"))
        );
        uint256 tokenAmount = IERC20(token).balanceOf(msg.sender);
        require(
            tokenAmount > 0,
            string(abi.encodePacked(tokenName, " zero balance"))
        );
        require(
            IERC20(netXToken).balanceOf(address(this)) >= tokenAmount,
            "Insufficient NetX balance"
        );

        uint256 beforeTokenBalance = IERC20(token).balanceOf(address(this));
        IERC20(token).transferFrom(msg.sender, address(this), tokenAmount);
        uint256 afterTokenBalance = IERC20(token).balanceOf(address(this));
        require(
            afterTokenBalance == beforeTokenBalance + tokenAmount,
            "Token transfer failed"
        );
        IERC20(netXToken).transfer(msg.sender, tokenAmount);

        emit SwapExecuted(msg.sender, token, tokenAmount);
    }

    function setNetXToken(address _netXToken) external onlyOwner {
        require(_netXToken != address(0), "Invalid NetX token address");
        netXToken = _netXToken;
    }

    function setTokens(
        address _triasNewToken,
        address _triasOldToken,
        address _tHECOToken,
        address _tToken
    ) external onlyOwner {
        triasNewToken = _triasNewToken;
        triasOldToken = _triasOldToken;
        tHECOToken = _tHECOToken;
        tToken = _tToken;
    }

    function claimTokens(address _token, address _receiver) external onlyOwner {
        uint256 balance = IERC20(_token).balanceOf(address(this));
        require(balance > 0, "No tokens to claim");
        IERC20(_token).transfer(_receiver, balance);
    }

    function setSwapTimeRange(
        uint256 _startTime,
        uint256 _endTime
    ) external onlyOwner {
        require(_startTime < _endTime, "Invalid swap time range");
        startTime = _startTime;
        endTime = _endTime;
    }

    function isSwapOpen() external view returns (bool) {
        return startTime <= block.timestamp && block.timestamp <= endTime;
    }
}
