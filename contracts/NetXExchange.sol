// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract NetXSwap is Ownable {
    address public netXToken;

    enum ActivityState {
        NoActivity, 
        ZoneOneActive,
        ZoneTwoActive,
        ZoneThreeActive
    }

    ActivityState public currentActivity;

    // Zone1
    address public triasNewToken;
    address public triasOldToken;
    address public tHECOToken;
    address public tToken;

    uint32 public triasRate = 1000; // 1 TRIAS = 1000 NetX
    uint32 public tHECORate = 1000; // 1 tHECO = 1000 NetX
    uint32 public tTokenRate = 1000; // 1 tToken = 1000 NetX

    // Zone2
    address public GrowToken;
    address public GeonToken;
    address public TSMToken;
    address public BEPUToken;

    uint32 public growRate = 1000; // 1 Grow = 1000 NetX
    uint32 public geonRate = 1000; // 1 Geon = 1000 NetX
    uint32 public tsmRate = 1000; // 1 TSM = 1000 NetX
    uint32 public bepuRate = 1000; // 1 BEPU = 1000 NetX

    //Zone3
    address public ship;
    address public triape;
    address public bastet;

    event ActivityChange(string beforeAcctivity, string afterActivity);
  
    constructor(
        address _initialOwner,
        address _netXToken
    ) Ownable(_initialOwner) {
        netXToken = _netXToken;
        currentActivity = ActivityState.NoActivity;
    }

    // Zone1
    function swapTriasToNetX() external {
        require(currentActivity == ActivityState.ZoneOneActive, "Another activity is already active");
        require(triasNewToken !=address(0), "No Token Exist On Chain");
        uint256 amount = IERC20(triasNewToken).balanceOf(msg.sender);
        require(amount > 0, "Amount must be greater than zero");
        // Transfer TRIAS from sender to this contract
        IERC20(triasNewToken).transferFrom(msg.sender, address(this), amount);
        // Transfer NetX tokens to the sender
        IERC20(netXToken).transfer(msg.sender, amount * triasRate / 1000);
    }

    function swapOldTriasToNetX() external {
        require(currentActivity == ActivityState.ZoneOneActive, "Another activity is already active");
        require(triasOldToken !=address(0), "No Token Exist On Chain");
        uint256 amount = IERC20(triasOldToken).balanceOf(msg.sender);
        require(amount > 0, "Amount must be greater than zero");
        // Transfer old TRIAS from sender to this contract
        IERC20(triasOldToken).transferFrom(msg.sender, address(this), amount);
        // Transfer NetX tokens to the sender
        IERC20(netXToken).transfer(msg.sender, amount * triasRate / 1000);
    }

    function swapTHECOToNetX() external {
        require(currentActivity == ActivityState.ZoneOneActive, "Another activity is already active");
        require(tHECOToken !=address(0), "No Token Exist On Chain");
        uint256 amount = IERC20(tHECOToken).balanceOf(msg.sender);
        require(amount > 0, "Amount must be greater than zero");
        // Transfer tHECO from sender to this contract
        IERC20(tHECOToken).transferFrom(msg.sender, address(this), amount);
        // Transfer NetX tokens to the sender
        IERC20(netXToken).transfer(msg.sender, amount * tHECORate / 1000);
    }

    function swapTTokenToNetX() external {
        require(currentActivity == ActivityState.ZoneOneActive, "Another activity is already active");
        require(tToken !=address(0), "No Token Exist On Chain");
        uint256 amount = IERC20(tToken).balanceOf(msg.sender);
        require(amount > 0, "Amount must be greater than zero");
        // Transfer tToken from sender to this contract
        IERC20(tToken).transferFrom(msg.sender, address(this), amount);
        // Transfer NetX tokens to the sender
        IERC20(netXToken).transfer(msg.sender, amount * tTokenRate / 1000);
    }

    // Zone2
    function swapGrowToNetX() external {
        require(currentActivity == ActivityState.ZoneTwoActive, "Another activity is already active");
        require(GrowToken !=address(0), "No Token Exist On Chain");
        uint256 amount = IERC20(GrowToken).balanceOf(msg.sender);
        require(amount > 0, "Amount must be greater than zero");
        // Transfer Grow from sender to this contract
        IERC20(GrowToken).transferFrom(msg.sender, address(this), amount);  
        // Transfer NetX tokens to the sender
        IERC20(netXToken).transfer(msg.sender, amount * growRate / 1000);
    }   

    function swapGeonToNetX() external {
        require(currentActivity == ActivityState.ZoneTwoActive, "Another activity is already active");
        require(GeonToken !=address(0), "No Token Exist On Chain");
        uint256 amount = IERC20(GeonToken).balanceOf(msg.sender);
        require(amount > 0, "Amount must be greater than zero");
        // Transfer Geon from sender to this contract
        IERC20(GeonToken).transferFrom(msg.sender, address(this), amount);
        // Transfer NetX tokens to the sender
        IERC20(netXToken).transfer(msg.sender, amount * geonRate / 1000);
    }

    function swapTSMToNetX() external {
        require(currentActivity == ActivityState.ZoneTwoActive, "Another activity is already active");
        require(TSMToken !=address(0), "No Token Exist On Chain");
        uint256 amount = IERC20(TSMToken).balanceOf(msg.sender);
        require(amount > 0, "Amount must be greater than zero");
        // Transfer TSM from sender to this contract
        IERC20(TSMToken).transferFrom(msg.sender, address(this), amount);
        // Transfer NetX tokens to the sender
        IERC20(netXToken).transfer(msg.sender, amount * tsmRate / 1000);
    }

    function swapBEPUToNetX() external {
        require(currentActivity == ActivityState.ZoneTwoActive, "Another activity is already active");
        require(BEPUToken !=address(0), "No Token Exist On Chain");
        uint256 amount = IERC20(BEPUToken).balanceOf(msg.sender);
        require(amount > 0, "Amount must be greater than zero");
        // Transfer BEPU from sender to this contract
        IERC20(BEPUToken).transferFrom(msg.sender, address(this), amount);
        // Transfer NetX tokens to the sender
        IERC20(netXToken).transfer(msg.sender, amount * bepuRate / 1000);
    }

    function setZoneOneToken(
        address _triasNewToken,
        address _triasOldToken,
        address _tHECOToken,
        address _tToken,
    ) external onlyOwner {
        triasNewToken = _triasNewToken;
        triasOldToken = _triasOldToken;
        tHECOToken = _tHECOToken;
        tToken = _tToken;
    }

    function setZoneOneRates(
        uint32 _triasRate,
        uint32 _tHECORate,
        uint32 _tTokenRate
    ) external onlyOwner {
        triasRate = _triasRate;
        tHECORate = _tHECORate;
        tTokenRate = _tTokenRate;
    }

    function setZoneTwoToken(
        address _growToken,
        address _geonToken,
        address _tsmToken,
        address _bepuToken
    ) external onlyOwner {
        GrowToken = _growToken;
        GeonToken = _geonToken;
        TSMToken = _tsmToken;
        BEPUToken = _bepuToken;
    }

    function setZoneTwoRates(
        uint32 _growRate,
        uint32 _geonRate,
        uint32 _tsmRate,
        uint32 _bepuRate
    ) external onlyOwner {
        growRate = _growRate;
        geonRate = _geonRate;
        tsmRate = _tsmRate;
        bepuRate = _bepuRate;
    }

    function setzoneThreeToken(
        address _ship,
        address _triape,
        address _bastet
    ) external onlyOwner {
        ship = _ship;
        triape = _triape;
        bastet = _bastet;
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

    function setActivityState(ActivityState _newActivity) external onlyOwner {
        string memory beforeActivity = getActivityName(currentActivity);
        currentActivity = _newActivity;
        string memory afterActivity = getActivityName(currentActivity);
        emit ActivityChange(beforeActivity, afterActivity);
    }

}
