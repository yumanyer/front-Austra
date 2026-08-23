// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Test.sol";
import "../src/mocks/KinetiqLaunchMock.sol";

contract LifecycleTest is Test {
    KinetiqLaunchMock launch;
    string constant MARKET = "YPF-PERP";
    string constant UNDERLYING = "YPF";
    uint8 constant MAX_LEV = 5;

    function setUp() public {
        launch = new KinetiqLaunchMock();
    }

    // ── Happy path ────────────────────────────────────────────────

    function test_FullLifecycleReachesLive() public {
        launch.deployMarket(MARKET, UNDERLYING, MAX_LEV);
        assertEq(uint8(launch.phaseOf(MARKET)), uint8(KinetiqLaunchMock.Phase.Deployed));

        launch.activateMarket(MARKET);
        launch.bondMarket(MARKET);
        launch.fund(MARKET);
        launch.launch(MARKET);

        assertEq(uint8(launch.phaseOf(MARKET)), uint8(KinetiqLaunchMock.Phase.Live));

        (string memory underlying, uint8 maxLeverage,) = launch.marketInfo(MARKET);
        assertEq(underlying, UNDERLYING);
        assertEq(maxLeverage, MAX_LEV);
    }

    function test_EmitsEventPerPhase() public {
        vm.expectEmit(true, false, false, true);
        emit KinetiqLaunchMock.MarketDeployed(MARKET, UNDERLYING, MAX_LEV);
        launch.deployMarket(MARKET, UNDERLYING, MAX_LEV);

        vm.expectEmit(true, false, false, false);
        emit KinetiqLaunchMock.MarketActivated(MARKET);
        launch.activateMarket(MARKET);

        vm.expectEmit(true, false, false, false);
        emit KinetiqLaunchMock.MarketBonded(MARKET);
        launch.bondMarket(MARKET);

        vm.expectEmit(true, false, false, false);
        emit KinetiqLaunchMock.MarketFunded(MARKET);
        launch.fund(MARKET);

        vm.expectEmit(true, false, false, false);
        emit KinetiqLaunchMock.MarketLaunched(MARKET);
        launch.launch(MARKET);
    }

    // ── Invalid transitions ───────────────────────────────────────

    function test_RevertWhen_ActivatingUnknownMarket() public {
        vm.expectRevert(KinetiqLaunchMock.InvalidPhase.selector);
        launch.activateMarket(MARKET);
    }

    function test_RevertWhen_BondingBeforeActivation() public {
        launch.deployMarket(MARKET, UNDERLYING, MAX_LEV);

        vm.expectRevert(KinetiqLaunchMock.InvalidPhase.selector);
        launch.bondMarket(MARKET);
    }

    function test_RevertWhen_FundingBeforeBond() public {
        launch.deployMarket(MARKET, UNDERLYING, MAX_LEV);
        launch.activateMarket(MARKET);

        vm.expectRevert(KinetiqLaunchMock.InvalidPhase.selector);
        launch.fund(MARKET);
    }

    function test_RevertWhen_LaunchingBeforeFunding() public {
        launch.deployMarket(MARKET, UNDERLYING, MAX_LEV);
        launch.activateMarket(MARKET);
        launch.bondMarket(MARKET);

        vm.expectRevert(KinetiqLaunchMock.InvalidPhase.selector);
        launch.launch(MARKET);
    }

    function test_RevertWhen_DuplicateDeploy() public {
        launch.deployMarket(MARKET, UNDERLYING, MAX_LEV);

        vm.expectRevert(KinetiqLaunchMock.MarketAlreadyExists.selector);
        launch.deployMarket(MARKET, UNDERLYING, MAX_LEV);
    }
}
