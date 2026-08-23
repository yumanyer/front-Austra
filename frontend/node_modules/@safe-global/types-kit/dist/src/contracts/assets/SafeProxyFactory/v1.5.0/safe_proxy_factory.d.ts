declare const _default: {
    readonly contractName: "SafeProxyFactory";
    readonly version: "1.5.0";
    readonly abi: readonly [{
        readonly anonymous: false;
        readonly inputs: readonly [{
            readonly indexed: true;
            readonly internalType: "contract SafeProxy";
            readonly name: "proxy";
            readonly type: "address";
        }, {
            readonly indexed: false;
            readonly internalType: "address";
            readonly name: "singleton";
            readonly type: "address";
        }, {
            readonly indexed: false;
            readonly internalType: "bytes";
            readonly name: "initializer";
            readonly type: "bytes";
        }, {
            readonly indexed: false;
            readonly internalType: "uint256";
            readonly name: "saltNonce";
            readonly type: "uint256";
        }, {
            readonly indexed: false;
            readonly internalType: "uint256";
            readonly name: "chainId";
            readonly type: "uint256";
        }];
        readonly name: "ChainSpecificProxyCreationL2";
        readonly type: "event";
    }, {
        readonly anonymous: false;
        readonly inputs: readonly [{
            readonly indexed: true;
            readonly internalType: "contract SafeProxy";
            readonly name: "proxy";
            readonly type: "address";
        }, {
            readonly indexed: false;
            readonly internalType: "address";
            readonly name: "singleton";
            readonly type: "address";
        }];
        readonly name: "ProxyCreation";
        readonly type: "event";
    }, {
        readonly anonymous: false;
        readonly inputs: readonly [{
            readonly indexed: true;
            readonly internalType: "contract SafeProxy";
            readonly name: "proxy";
            readonly type: "address";
        }, {
            readonly indexed: false;
            readonly internalType: "address";
            readonly name: "singleton";
            readonly type: "address";
        }, {
            readonly indexed: false;
            readonly internalType: "bytes";
            readonly name: "initializer";
            readonly type: "bytes";
        }, {
            readonly indexed: false;
            readonly internalType: "uint256";
            readonly name: "saltNonce";
            readonly type: "uint256";
        }];
        readonly name: "ProxyCreationL2";
        readonly type: "event";
    }, {
        readonly inputs: readonly [{
            readonly internalType: "address";
            readonly name: "_singleton";
            readonly type: "address";
        }, {
            readonly internalType: "bytes";
            readonly name: "initializer";
            readonly type: "bytes";
        }, {
            readonly internalType: "uint256";
            readonly name: "saltNonce";
            readonly type: "uint256";
        }];
        readonly name: "createChainSpecificProxyWithNonce";
        readonly outputs: readonly [{
            readonly internalType: "contract SafeProxy";
            readonly name: "proxy";
            readonly type: "address";
        }];
        readonly stateMutability: "nonpayable";
        readonly type: "function";
    }, {
        readonly inputs: readonly [{
            readonly internalType: "address";
            readonly name: "_singleton";
            readonly type: "address";
        }, {
            readonly internalType: "bytes";
            readonly name: "initializer";
            readonly type: "bytes";
        }, {
            readonly internalType: "uint256";
            readonly name: "saltNonce";
            readonly type: "uint256";
        }];
        readonly name: "createChainSpecificProxyWithNonceL2";
        readonly outputs: readonly [{
            readonly internalType: "contract SafeProxy";
            readonly name: "proxy";
            readonly type: "address";
        }];
        readonly stateMutability: "nonpayable";
        readonly type: "function";
    }, {
        readonly inputs: readonly [{
            readonly internalType: "address";
            readonly name: "_singleton";
            readonly type: "address";
        }, {
            readonly internalType: "bytes";
            readonly name: "initializer";
            readonly type: "bytes";
        }, {
            readonly internalType: "uint256";
            readonly name: "saltNonce";
            readonly type: "uint256";
        }];
        readonly name: "createProxyWithNonce";
        readonly outputs: readonly [{
            readonly internalType: "contract SafeProxy";
            readonly name: "proxy";
            readonly type: "address";
        }];
        readonly stateMutability: "nonpayable";
        readonly type: "function";
    }, {
        readonly inputs: readonly [{
            readonly internalType: "address";
            readonly name: "_singleton";
            readonly type: "address";
        }, {
            readonly internalType: "bytes";
            readonly name: "initializer";
            readonly type: "bytes";
        }, {
            readonly internalType: "uint256";
            readonly name: "saltNonce";
            readonly type: "uint256";
        }];
        readonly name: "createProxyWithNonceL2";
        readonly outputs: readonly [{
            readonly internalType: "contract SafeProxy";
            readonly name: "proxy";
            readonly type: "address";
        }];
        readonly stateMutability: "nonpayable";
        readonly type: "function";
    }, {
        readonly inputs: readonly [];
        readonly name: "getChainId";
        readonly outputs: readonly [{
            readonly internalType: "uint256";
            readonly name: "";
            readonly type: "uint256";
        }];
        readonly stateMutability: "view";
        readonly type: "function";
    }, {
        readonly inputs: readonly [];
        readonly name: "proxyCreationCode";
        readonly outputs: readonly [{
            readonly internalType: "bytes";
            readonly name: "";
            readonly type: "bytes";
        }];
        readonly stateMutability: "pure";
        readonly type: "function";
    }];
};
export default _default;
//# sourceMappingURL=safe_proxy_factory.d.ts.map