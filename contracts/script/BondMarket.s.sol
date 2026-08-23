// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Script.sol";
import "../src/interfaces/IKinetiqLaunch.sol";

/// @notice Final steps of the Kinetiq Launch lifecycle: bondMarket -> fund -> launch.
/// @dev Each call is a separate transaction; the mock reverts if any phase was skipped.
contract BondMarket is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        IKinetiqLaunch kinetiq = IKinetiqLaunch(vm.envAddress("KINETIQ_LAUNCH_ADDRESS"));
        string memory marketName = vm.envOr("MARKET_NAME", string("YPF-PERP"));

        vm.startBroadcast(deployerKey);

        kinetiq.bondMarket(marketName);
        console2.log("Kinetiq: bondMarket called for %s", marketName);

        kinetiq.fund(marketName);
        console2.log("Kinetiq: fund called for %s", marketName);

        kinetiq.launch(marketName);
        console2.log("Kinetiq: launch called for %s - market is live", marketName);

        vm.stopBroadcast();
    }
}
