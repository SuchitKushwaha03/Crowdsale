//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.5.0;

import 'hardhat/console.sol';

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20Mintable.sol";
import "@openzeppelin/contracts/token/ERC20/TokenTimelock.sol";
import "@openzeppelin/contracts/crowdsale/Crowdsale.sol";
import "@openzeppelin/contracts/crowdsale/emission/MintedCrowdsale.sol";
import "@openzeppelin/contracts/crowdsale/validation/CappedCrowdsale.sol";
import "@openzeppelin/contracts/crowdsale/validation/TimedCrowdsale.sol";
import "@openzeppelin/contracts/crowdsale/validation/WhitelistCrowdsale.sol";
import "@openzeppelin/contracts/crowdsale/distribution/RefundableCrowdsale.sol";


contract TokenCrowdsale is 
Crowdsale,
MintedCrowdsale,
CappedCrowdsale,
TimedCrowdsale,
WhitelistCrowdsale,
FinalizableCrowdsale
{
    
    //Minimum Investors contribution
    //Maximum Investors contribution 

    uint256 public investorMinCap = 2e15;
    uint256 public investorHardCap = 5e19;

    //PERC in Basis Point
    uint256 public constant TOTAL_SALE_PERC = 7000;
    uint256 public constant TOTAL_FOUNDER_PERC = 2000;
    uint256 public constant TOTAL_REWARD_PERC = 500;


    //Vesting process :using Timelock 

    address public _founderAddr;
    uint256 public _releaseTime;

    TokenTimelock private founderTimelock;

    //capped contributions  
    mapping(address => uint256) public investorsContributions;
    
    
    constructor(
        uint256 rate, 
        address payable wallet, 
        ERC20 token,
        uint256 cap,
        uint256 openingTime,
        uint256 closingTime,
        address founderAddr,
        uint256 releaseTime
    ) public
    Crowdsale(rate, wallet, token)
    CappedCrowdsale(cap)
    TimedCrowdsale(openingTime, closingTime)
    {
        _founderAddr = founderAddr;
        _releaseTime = releaseTime;

        // console.log("ReleaseTime Provided:",_releaseTime);
    }

    function getCurrentTime() public view returns(uint256){
        return block.timestamp;
    }
    function _preValidatePurchase(
        address beneficiary, 
        uint256 weiAmount
    ) internal  view{
        super._preValidatePurchase(beneficiary, weiAmount);
        uint256 _existingContributions = investorsContributions[beneficiary];
        uint256 _newContributions =_existingContributions.add(weiAmount);

        require( 
            _newContributions > investorMinCap,
            "TokenCrowdsale: Your investment is below Min. Cap"
         );
        require( 
            _newContributions < investorHardCap, 
            "TokenCrowdsale: Your investment exceeds Hard Cap"
        );
    }

    function _updatePurchasingState(address beneficiary, uint256 weiAmount) internal {
        super._updatePurchasingState(beneficiary,weiAmount);
        investorsContributions[beneficiary] += weiAmount;
    }
/** This Function is called to finalize the crowdsale */
    function _finalization() internal {
        ERC20Mintable _mintableToken = ERC20Mintable(address(token()));

        uint256 _mintedTokensSupply = _mintableToken.totalSupply();

        uint256 _totalMintedSupply = _mintedTokensSupply.mul(10000).div(TOTAL_SALE_PERC);

        founderTimelock = new TokenTimelock(
                                    token(),
                                    address(_founderAddr),
                                    _releaseTime
                                );

        _mintableToken.mint(address(founderTimelock), _totalMintedSupply.mul(TOTAL_FOUNDER_PERC).div(10000));
        
        // console.log(_totalMintedSupply.mul(TOTAL_FOUNDER_PERC).div(10000));
        _mintableToken.renounceMinter();
        ERC20Pausable _pausableToken = ERC20Pausable(address(token()));
        _pausableToken.unpause();
        super._finalization();
    }

    function releaseFounderFunds() public  {
        require(msg.sender == _founderAddr, "TokenCrowdsale: should be called by fund manager");
        TokenTimelock(address(founderTimelock)).release();
    }
    
}