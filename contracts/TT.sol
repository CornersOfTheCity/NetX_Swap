// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract TT is ERC20 {
    uint256 public constant TOTAL_SUPPLY = 6_547_292 * 1e18;

    constructor() ERC20("TT", "TT") {
        _mint(msg.sender, TOTAL_SUPPLY);
    }
}
