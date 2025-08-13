// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

contract NetXSwap is Ownable, ReentrancyGuard {
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;

    address public netXToken;

    address public triasNewToken;
    address public triasOldToken;
    address public tHECOToken;
    address public tToken;

    uint256 public startTime;
    uint256 public endTime;

    address public verifyAddress;
    mapping(address => uint256) public userNonces;
    mapping(bytes32 => bool) public usedMessages;

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
        uint256 amountOut,
        bytes32 orderId
    );

    event ClaimExecuted(
        address indexed claimer,
        uint256 indexed chainId,
        uint256 indexed claimAmount,
        uint256 claimNonce,
        bytes32 orderId
    );

    event VerifierUpdated(address indexed newVerifier);

    constructor(
        address _initialOwner,
        address _trias,
        uint256 _startTime,
        uint256 _endTime
    ) Ownable(_initialOwner) {
        triasNewToken = _trias;
        startTime = _startTime;
        endTime = _endTime;
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

        if (block.chainid == 56 || block.chainid == 97) {
            require(
                IERC20(netXToken).balanceOf(address(this)) >= tokenAmount,
                "Insufficient NetX balance"
            );
        }
        uint256 beforeTokenBalance = IERC20(token).balanceOf(address(this));
        IERC20(token).transferFrom(msg.sender, address(this), tokenAmount);
        uint256 afterTokenBalance = IERC20(token).balanceOf(address(this));
        require(
            afterTokenBalance == beforeTokenBalance + tokenAmount,
            "Token transfer failed"
        );
        if (block.chainid == 56 || block.chainid == 97) {
            IERC20(netXToken).transfer(msg.sender, tokenAmount);
        }
        bytes32 message = keccak256(
            abi.encodePacked(
                msg.sender,
                token,
                tokenAmount,
                block.chainid,
                address(this),
                block.timestamp
            )
        );
        bytes32 hashedMessage = message.toEthSignedMessageHash();

        emit SwapExecuted(msg.sender, token, tokenAmount, hashedMessage);
    }

    function userClaim(
        uint256 claimAmount,
        uint256 chainId,
        bytes32 orderId,
        bytes memory signature
    ) external onlyWhenSwapOpen nonReentrant {
        require(
            block.chainid == 56 || block.chainid == 97,
            "Unsupported chain"
        );
        require(usedMessages[orderId] == false, "Message already used");
        require(verifyAddress != address(0), "Verifier address not set");

        bytes32 message = keccak256(
            abi.encodePacked(
                msg.sender,
                claimAmount,
                userNonces[msg.sender],
                chainId,
                address(this),
                orderId
            )
        );
        bytes32 hashedMessage = message.toEthSignedMessageHash();
        address signer = hashedMessage.recover(signature);
        require(signer == verifyAddress, "Invalid signer");

        userNonces[msg.sender]++;
        uint256 netXBalance = IERC20(netXToken).balanceOf(address(this));
        require(netXBalance > claimAmount, "Not Enough NetX tokens to claim");
        IERC20(netXToken).transfer(msg.sender, claimAmount);
        usedMessages[orderId] = true;

        emit ClaimExecuted(
            msg.sender,
            chainId,
            claimAmount,
            userNonces[msg.sender],
            orderId
        );
    }

    function setTriasToken(address _triasToken) external onlyOwner {
        require(_triasToken != address(0), "Invalid NetX token address");
        triasNewToken = _triasToken;
    }

    function setTokens(
        address _netXToken,
        address _triasOldToken,
        address _tHECOToken,
        address _tToken
    ) external onlyOwner {
        netXToken = _netXToken;
        triasOldToken = _triasOldToken;
        tHECOToken = _tHECOToken;
        tToken = _tToken;
    }

    function setVerifier(address _verifier) external onlyOwner {
        require(_verifier != address(0), "Invalid verifier address");
        verifyAddress = _verifier;
        emit VerifierUpdated(_verifier);
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
