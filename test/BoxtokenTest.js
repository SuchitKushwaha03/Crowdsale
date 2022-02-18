const { expect, assert } = require("chai");

// const { currentTimestamp } = require('./currentTimestamp')

describe("Crowdsale Testing", async () => {

    let TokenCrowdsale, tokencrowdsale ;
    let owner, investor0, investor1, addr ;
    let Voxer, voxer ;
    let startingTime, closingTime

    beforeEach("Deploys contract before each testcase", async () => {

        [owner, founder, investor0, investor1,...addr] = await ethers.getSigners();
    
    //TODO: voxer token deployed 
        Voxer = await ethers.getContractFactory('Voxer')
        voxer = await Voxer.deploy("Voxer",'Vox',18);
        await voxer.deployed()

    //TODO: to get current timestamp
        const blockNumBefore = await ethers.provider.getBlockNumber();
        const blockBefore = await ethers.provider.getBlock(blockNumBefore);
        
        const ThirtyDays = 30*24*60*60;
        startingTime = blockBefore.timestamp + 1;
        closingTime = startingTime + ThirtyDays;

        const OneYear = 365*24*60*60

        releaseTime = startingTime + OneYear;
    
    //TODO: TokenCrowdsale deployed
        TokenCrowdsale = await ethers.getContractFactory('TokenCrowdsale')
        tokencrowdsale = await TokenCrowdsale.deploy(
            ethers.constants.WeiPerEther, 
            owner.address, 
            voxer.address,
            ethers.utils.parseEther("100"),
            startingTime,
            closingTime,
            founder.address,
            releaseTime
        );
        await tokencrowdsale.deployed();
    //TODO: TimeLock contract deploy
    // !this line used to add TokenCrowdsale contract as a minter
        await voxer.addMinter(tokencrowdsale.address);

    // !this line will pause the contract for transfer before crowdsale
        await voxer.pause();

    // ?This line used to add inverstor0 and investor1 as whitelisted in crowdsale
        await tokencrowdsale.addWhitelisted(investor0.address)
        await tokencrowdsale.addWhitelisted(investor1.address)

        await voxer.addPauser(tokencrowdsale.address)
        // console.log(tokencrowdsale);
        // console.log(voxer);
    })

    describe("Simple Crowdsale", async () => {

        it("checks the contract is deployed or not", async() => {
            expect(await tokencrowdsale.address).to.not.equal(ethers.constants.AddressZero);
        })
    })

    describe("Minted Crowdsale: Accepts payments", async() => {
        
        it("contract Accepts Payment", async () => {

        //TODO: The crowdsale contract forwards the fund to _wallet as soon as it gets it
            await expect(
                await investor0.sendTransaction({
                    to: tokencrowdsale.address, 
                    value: ethers.utils.parseEther('1') 
                })
            )
            .to.changeEtherBalance(owner, ethers.utils.parseEther('1') );
        
        //TODO: used buy token function to mint tokens directly
            await expect(
                await tokencrowdsale.connect(investor1).buyTokens(investor0.address,{
                    value: ethers.utils.parseEther('1') 
                })
            )
            .to.changeEtherBalance(owner, ethers.utils.parseEther('1') );
        })

        it("total supply should change after minting", async () => {
            
            const totalsupplybefore = await voxer.totalSupply();
            expect(
                await investor0.sendTransaction({
                    to: tokencrowdsale.address, 
                    value: ethers.utils.parseEther('1') 
                })
            )
            const totalsupplyafter = await voxer.totalSupply();

            assert.isTrue(totalsupplyafter > totalsupplybefore)
        })
    })

    describe("Capped Crowdsale: Checking different situations", async () => {
        
        it('checks the Cap amount',async() => {
            expect(await tokencrowdsale.cap()).to.equal(ethers.utils.parseEther('100'))
        })
        
        

        it("Buying tokens outside the capped limits and expect to revert", async () => {
            
            //! investorsMinCap-1 
            const minCap = ethers.utils.parseEther("0.002").sub(ethers.BigNumber.from("1"));
            
            await expect(
            tokencrowdsale.buyTokens(
                investor0.address,
                {value: minCap}
                )
            ).to.be.revertedWith("TokenCrowdsale: Your investment is below Min. Cap")
            
            //! investorsHardCap + 1
            const maxCap = ethers.utils.parseEther("50").add(ethers.BigNumber.from("1")); 
            
            await expect(
                tokencrowdsale.buyTokens(
                    investor0.address,
                    {value: maxCap}
                )
            ).to.be.revertedWith("TokenCrowdsale: Your investment exceeds Hard Cap")
        })

        it("buying token inside Capped range and reaching cap value",async ()=>{

            const maxCap = ethers.utils.parseEther("49");
            await expect(
                await tokencrowdsale.connect(investor1).buyTokens(
                    investor0.address,
                    {value: maxCap}
                )
            ).to.changeEtherBalance(owner, maxCap.toString() )

            await expect(
                await tokencrowdsale.connect(investor0).buyTokens(
                    investor1.address,
                    {value: maxCap}
                )
            ).to.changeEtherBalance(owner, maxCap.toString() )
            
        // ?Above Two transaction will help to reach near to contract cap
        // ?Below transaction will try to go beyond capped range and revert
        await expect(
               tokencrowdsale.connect(addr[0]).buyTokens(
                    investor0.address,
                    {value: maxCap}
                )
            ).to.be.revertedWith('CappedCrowdsale: cap exceeded')
            
        })
    })

    describe("TimedCrowdsale: minting during and after crowdSale", async () => {

        it("Mints Token in time range", async() => {
            
            const amount = ethers.utils.parseEther('1'); 

            await expect(
                await tokencrowdsale.connect(investor1).buyTokens(investor0.address,{
                    value: amount
                })
            )
            .to.changeEtherBalance(owner, ethers.utils.parseEther('1') );
        })

        it("Mints Token outside Time Range and Expecting to revert", async () => {

            await timeAndMine.increaseTime("31d")

            const amount = ethers.utils.parseEther('1'); 
            
            await expect(
                tokencrowdsale.connect(investor1).buyTokens(investor0.address,{
                    value: amount
                })
            )
            .to.be.reverted;
        })
        
    })

    describe("Whitelisted Crowdsale: Minting Tokens with and without Whitelist Role", async ()=> {
        
        it("Checks can token be minted for beneficiery without whitelist", async () => {
            
            await tokencrowdsale.removeWhitelisted(investor0.address);

            await expect(
                tokencrowdsale.connect(investor1).buyTokens(
                    investor0.address,
                    {value: "10000"}
                )
            ).to.be
            .revertedWith("WhitelistCrowdsale: beneficiary doesn't have the Whitelisted role")
            
        }) 
    })

    describe("Finalizing the Crowdsale", async () => {
        
    

        it("calling finalize before time",async () => {
            
            await expect (tokencrowdsale.finalize())
            .to.be.revertedWith('FinalizableCrowdsale: not closed');
            
        })
        it("Finalizes the crowdsale", async () => {
            
        // TODO: Finalizing the contract after incresing time  and then trying to mint tokens

            await timeAndMine.increaseTime("31d")
            await tokencrowdsale.finalize();
            await expect(
                tokencrowdsale.connect(investor1).buyTokens(
                    investor0.address,
                    {value: "10000"}
                )
            ).to.be.reverted;
        })

        it("Trying to transfer ERC20 tokens before end of crowdsale and expecting to revert", async () => {
            
        // TODO: Minting tokens for user
            await tokencrowdsale.connect(investor1).buyTokens(investor0.address,{
                value: ethers.utils.parseEther('1')
            });
        // TODO: trying to transfer above minted token before crowdsale
            await expect(voxer.connect(investor0).transfer(investor1.address,1000))
            .to.be.reverted;
        })

        it("Trying to transfer ERC20 tokens after end of crowdsale", async () => {
            
            await tokencrowdsale.connect(investor1).buyTokens(investor0.address,{
                value: ethers.utils.parseEther('1')
            });

        // TODO: increase time to 31 days
            timeAndMine.increaseTime("31d");

        // TODO: finalizing the crowdsale by calling finalize function
            tokencrowdsale.finalize();

        // TODO: Trying to transfer tokens from one user to another user after crowdsale
            await expect(await voxer.connect(investor0).transfer(investor1.address,1000))
            .to.emit(voxer,'Transfer')
            .withArgs(investor0.address,investor1.address,1000);
        })
    })

    describe("Vesting Crowdsale", async () => {
        
        it("Increases time and release fund from TimeLock",async () => {

            const maxCap = ethers.utils.parseEther('20')
            await tokencrowdsale.connect(investor1).buyTokens(
                investor0.address,
                {value: maxCap}
            )
            await tokencrowdsale.connect(investor1).buyTokens(
                investor0.address,
                {value: maxCap}
            )
            await timeAndMine.increaseTime("31d")
            await tokencrowdsale.finalize();

            await timeAndMine.increaseTime("1y");

            const balanceBefore = await voxer.balanceOf(founder.address);
            await tokencrowdsale.connect(founder).releaseFounderFunds();
            const balanceAfter = await voxer.balanceOf(founder.address);
            assert.isTrue(balanceBefore < balanceAfter)
        })
    })


})