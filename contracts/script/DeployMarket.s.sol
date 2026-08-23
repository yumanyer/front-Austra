// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Script.sol";
import "../src/YPFOracle.sol";
import "../src/mocks/KinetiqLaunchMock.sol";
import "../src/interfaces/IKinetiqLaunch.sol";

/// @notice Deploys YPFOracle and initiates the Kinetiq Launch lifecycle with deployMarket.
/// @dev Set DEPLOY_MOCK=true to also deploy a KinetiqLaunchMock (Anvil / rehearsal).
contract DeployMarket is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer = vm.addr(deployerKey);

        string memory marketName = vm.envOr("MARKET_NAME", string("YPF-PERP"));
        string memory underlying = vm.envOr("UNDERLYING", string("YPF"));
        uint8 maxLeverage = uint8(vm.envOr("MAX_LEVERAGE", uint256(5)));

        vm.startBroadcast(deployerKey);

        // Deploy oracle - pusher defaults to the deployer; rotate later via setPusher()
        YPFOracle oracle = new YPFOracle(deployer);
        console2.log("YPFOracle deployed at:", address(oracle));
        console2.log("Set ORACLE_CONTRACT_ADDRESS=%s in backend .env", address(oracle));

        IKinetiqLaunch kinetiq;
        if (vm.envOr("DEPLOY_MOCK", false)) {
            KinetiqLaunchMock mock = new KinetiqLaunchMock();
            console2.log("KinetiqLaunchMock deployed at:", address(mock));
            console2.log("Set KINETIQ_LAUNCH_ADDRESS=%s", address(mock));
            kinetiq = mock;
        } else {
            kinetiq = IKinetiqLaunch(vm.envAddress("KINETIQ_LAUNCH_ADDRESS"));
        }

        kinetiq.deployMarket(marketName, underlying, maxLeverage);
        console2.log("Kinetiq: deployMarket called for %s", marketName);

        vm.stopBroadcast();
    }
}
