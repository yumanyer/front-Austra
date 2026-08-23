// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "./interfaces/IHyperOracle.sol";

/// @notice Minimal oracle contract that stores prices pushed by an authorized backend pusher.
/// Price is stored with 1e6 precision (e.g., 42_315_000 = $42.315000).
contract YPFOracle is IHyperOracle {
    address public owner;
    address public pusher;

    struct PriceData {
        uint256 price;
        uint64 timestamp;
    }

    mapping(bytes32 => PriceData) private prices;
    bytes32 public constant YPF = keccak256("YPF");

    event PricePushed(bytes32 indexed symbol, uint256 price, uint64 timestamp);
    event PusherUpdated(address indexed oldPusher, address indexed newPusher);

    error Unauthorized();
    error InvalidPrice();
    error InvalidTimestamp();

    constructor(address _pusher) {
        owner = msg.sender;
        pusher = _pusher;
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert Unauthorized();
        _;
    }

    modifier onlyPusher() {
        if (msg.sender != pusher) revert Unauthorized();
        _;
    }

    function setPusher(address _pusher) external onlyOwner {
        emit PusherUpdated(pusher, _pusher);
        pusher = _pusher;
    }

    function pushPrice(bytes32 symbol, uint256 price, uint64 timestamp) external onlyPusher {
        if (price == 0) revert InvalidPrice();
        if (timestamp > block.timestamp) revert InvalidTimestamp();
        prices[symbol] = PriceData({ price: price, timestamp: timestamp });
        emit PricePushed(symbol, price, timestamp);
    }

    function latestPrice() external view returns (uint256 price, uint64 timestamp) {
        PriceData memory d = prices[YPF];
        return (d.price, d.timestamp);
    }

    function latestPriceFor(bytes32 symbol) external view returns (uint256 price, uint64 timestamp) {
        PriceData memory d = prices[symbol];
        return (d.price, d.timestamp);
    }

    /// @notice True if the primary asset price exists and was pushed within `maxAge` seconds.
    function isFresh(uint256 maxAge) external view returns (bool) {
        return isFreshFor(YPF, maxAge);
    }

    /// @notice True if `symbol` has a price and it was pushed within `maxAge` seconds.
    function isFreshFor(bytes32 symbol, uint256 maxAge) public view returns (bool) {
        uint64 ts = prices[symbol].timestamp;
        return ts != 0 && block.timestamp - ts <= maxAge;
    }
}
