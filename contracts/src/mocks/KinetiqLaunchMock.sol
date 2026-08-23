// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "../interfaces/IKinetiqLaunch.sol";

/// @notice Rehearsal stand-in for Kinetiq Launch, deployable on any EVM (Anvil / HyperEVM testnet).
/// @dev NOT production code. Enforces lifecycle ordering and emits one event per phase so
///      scripts, explorers and the demo frontend can observe each transition of the cycle:
///      deployMarket -> activateMarket -> bondMarket -> fund -> launch.
contract KinetiqLaunchMock is IKinetiqLaunch {
    enum Phase {
        None,
        Deployed,
        Activated,
        Bonded,
        Funded,
        Live
    }

    struct MarketInfo {
        string underlying;
        uint8 maxLeverage;
        Phase phase;
    }

    mapping(bytes32 => MarketInfo) private _markets;

    event MarketDeployed(string indexed name, string underlying, uint8 maxLeverage);
    event MarketActivated(string indexed name);
    event MarketBonded(string indexed name);
    event MarketFunded(string indexed name);
    event MarketLaunched(string indexed name);

    error MarketAlreadyExists();
    error InvalidPhase();

    function deployMarket(string calldata name, string calldata underlying, uint8 maxLeverage) external {
        bytes32 id = keccak256(bytes(name));
        if (_markets[id].phase != Phase.None) revert MarketAlreadyExists();

        _markets[id] = MarketInfo({ underlying: underlying, maxLeverage: maxLeverage, phase: Phase.Deployed });
        emit MarketDeployed(name, underlying, maxLeverage);
    }

    function activateMarket(string calldata name) external {
        _requirePhase(name, Phase.Deployed);
        _setPhase(name, Phase.Activated);
        emit MarketActivated(name);
    }

    function bondMarket(string calldata name) external {
        _requirePhase(name, Phase.Activated);
        _setPhase(name, Phase.Bonded);
        emit MarketBonded(name);
    }

    function fund(string calldata name) external {
        _requirePhase(name, Phase.Bonded);
        _setPhase(name, Phase.Funded);
        emit MarketFunded(name);
    }

    function launch(string calldata name) external {
        _requirePhase(name, Phase.Funded);
        _setPhase(name, Phase.Live);
        emit MarketLaunched(name);
    }

    function phaseOf(string calldata name) external view returns (Phase) {
        return _markets[keccak256(bytes(name))].phase;
    }

    function marketInfo(string calldata name)
        external
        view
        returns (string memory underlying, uint8 maxLeverage, Phase phase)
    {
        MarketInfo storage m = _markets[keccak256(bytes(name))];
        return (m.underlying, m.maxLeverage, m.phase);
    }

    function _requirePhase(string calldata name, Phase required) internal view {
        if (_markets[keccak256(bytes(name))].phase != required) revert InvalidPhase();
    }

    function _setPhase(string calldata name, Phase next) internal {
        _markets[keccak256(bytes(name))].phase = next;
    }
}
