// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract NetXToken is ERC20, Ownable, ERC20Permit {
    uint256 public constant TOTAL_SUPPLY = 50_000_000 * 1e18; 
    uint256 public constant INITIAL_MINT = 20_000_000 * 1e18; 
    uint256 public totalMinted;

    event Mint(address indexed to, uint256 amount);
    event Burn(address indexed from, uint256 amount);
    event PermitCancelled(address indexed owner, uint256 nonce);
    constructor(address initialOwner)
        ERC20("NetX Token", "NETX")
        Ownable(initialOwner)
        ERC20Permit("NetX Token")
    {
        _mint(initialOwner, INITIAL_MINT);
        totalMinted = INITIAL_MINT; 
    }

    function mint(address to, uint256 amount) public onlyOwner {
        require(totalMinted + amount <= TOTAL_SUPPLY, "Exceeds total mintable supply");
        _mint(to, amount);
        totalMinted += amount; 
        emit Mint(to, amount);
    }

    function burn(uint256 amount) public onlyOwner{
        _burn(msg.sender, amount);
        emit Burn(msg.sender, amount);
    }

    function cancelPermit() external {
        uint256 currentNonce = nonces(msg.sender);
        emit PermitCancelled(msg.sender, currentNonce);
        _useNonce(msg.sender);
    }
}
