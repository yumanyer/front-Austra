// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Test.sol";
import "../src/YPFOracle.sol";

contract YPFOracleTest is Test {
    YPFOracle oracle;
    address owner = address(1);
    address pusher = address(2);
    address stranger = address(3);

    bytes32 constant YPF = keccak256("YPF");

    function setUp() public {
        vm.prank(owner);
        oracle = new YPFOracle(pusher);
    }

    function test_PushAndReadPrice() public {
        uint256 price = 42_315_000; // $42.315 with 1e6 precision
        uint64 ts = uint64(block.timestamp);

        vm.prank(pusher);
        oracle.pushPrice(YPF, price, ts);

        (uint256 p, uint64 t) = oracle.latestPrice();
        assertEq(p, price);
        assertEq(t, ts);
    }

    function test_OnlyPusherCanPush() public {
        vm.prank(stranger);
        vm.expectRevert(YPFOracle.Unauthorized.selector);
        oracle.pushPrice(YPF, 42_000_000, uint64(block.timestamp));
    }

    function test_OwnerCanUpdatePusher() public {
        vm.prank(owner);
        oracle.setPusher(stranger);
        assertEq(oracle.pusher(), stranger);

        vm.prank(stranger);
        oracle.pushPrice(YPF, 43_000_000, uint64(block.timestamp));
        (uint256 p,) = oracle.latestPrice();
        assertEq(p, 43_000_000);
    }

    function test_LatestPriceFor() public {
        vm.prank(pusher);
        oracle.pushPrice(YPF, 42_315_000, uint64(block.timestamp));

        (uint256 p,) = oracle.latestPriceFor(YPF);
        assertEq(p, 42_315_000);
    }

    // ── Validation ────────────────────────────────────────────────

    function test_RevertWhen_PriceIsZero() public {
        vm.prank(pusher);
        vm.expectRevert(YPFOracle.InvalidPrice.selector);
        oracle.pushPrice(YPF, 0, uint64(block.timestamp));
    }

    function test_RevertWhen_TimestampInFuture() public {
        uint64 futureTs = uint64(block.timestamp + 1);

        vm.prank(pusher);
        vm.expectRevert(YPFOracle.InvalidTimestamp.selector);
        oracle.pushPrice(YPF, 42_000_000, futureTs);
    }

    function test_PushOverwritesPreviousPrice() public {
        vm.startPrank(pusher);
        oracle.pushPrice(YPF, 40_000_000, uint64(block.timestamp));
        vm.warp(block.timestamp + 10);
        oracle.pushPrice(YPF, 41_000_000, uint64(block.timestamp));
        vm.stopPrank();

        (uint256 p, uint64 t) = oracle.latestPrice();
        assertEq(p, 41_000_000);
        assertEq(t, block.timestamp);
    }

    // ── Staleness ─────────────────────────────────────────────────

    function test_IsFresh() public {
        assertFalse(oracle.isFresh(60)); // nothing pushed yet

        vm.prank(pusher);
        oracle.pushPrice(YPF, 42_000_000, uint64(block.timestamp));
        assertTrue(oracle.isFresh(60));

        vm.warp(block.timestamp + 61);
        assertFalse(oracle.isFresh(60));
        assertTrue(oracle.isFresh(61));
    }

    function test_IsFreshForUnknownSymbol() public {
        bytes32 unknown = keccak256("NOPE");
        assertFalse(oracle.isFreshFor(unknown, 3600));
    }

    // ── Fuzzing ───────────────────────────────────────────────────

    function testFuzz_PushValidPrices(uint192 rawPrice, uint32 rawAge) public {
        vm.warp(1_700_000_000); // headroom so timestamp - age never underflows
        uint256 price = uint256(rawPrice) + 1; // exclude zero
        uint32 age = uint32(bound(rawAge, 0, block.timestamp - 1)); // keep timestamp >= 1
        uint64 ts = uint64(block.timestamp - age);

        vm.prank(pusher);
        oracle.pushPrice(YPF, price, ts);

        (uint256 stored, uint64 storedTs) = oracle.latestPrice();
        assertEq(stored, price);
        assertEq(storedTs, ts);
        assertTrue(oracle.isFreshFor(YPF, age), "price should be fresh within its own age");
    }
}
