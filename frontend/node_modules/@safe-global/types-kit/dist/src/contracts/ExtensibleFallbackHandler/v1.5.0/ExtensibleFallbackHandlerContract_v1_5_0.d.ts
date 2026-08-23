import { ExtractAbiFunctionNames } from 'abitype';
import ExtensibleFallbackHandlerBaseContract from '../ExtensibleFallbackHandlerBaseContract';
import { ContractFunction } from '../../common/BaseContract';
declare const extensibleFallbackHandlerContract_v1_5_0_AbiTypes: readonly [{
    readonly anonymous: false;
    readonly inputs: readonly [{
        readonly indexed: true;
        readonly internalType: "contract ISafe";
        readonly name: "safe";
        readonly type: "address";
    }, {
        readonly indexed: false;
        readonly internalType: "bytes4";
        readonly name: "interfaceId";
        readonly type: "bytes4";
    }];
    readonly name: "AddedInterface";
    readonly type: "event";
}, {
    readonly anonymous: false;
    readonly inputs: readonly [{
        readonly indexed: true;
        readonly internalType: "contract ISafe";
        readonly name: "safe";
        readonly type: "address";
    }, {
        readonly indexed: false;
        readonly internalType: "bytes32";
        readonly name: "domainSeparator";
        readonly type: "bytes32";
    }, {
        readonly indexed: false;
        readonly internalType: "contract ISafeSignatureVerifier";
        readonly name: "oldVerifier";
        readonly type: "address";
    }, {
        readonly indexed: false;
        readonly internalType: "contract ISafeSignatureVerifier";
        readonly name: "newVerifier";
        readonly type: "address";
    }];
    readonly name: "ChangedDomainVerifier";
    readonly type: "event";
}, {
    readonly anonymous: false;
    readonly inputs: readonly [{
        readonly indexed: true;
        readonly internalType: "contract ISafe";
        readonly name: "safe";
        readonly type: "address";
    }, {
        readonly indexed: false;
        readonly internalType: "bytes4";
        readonly name: "selector";
        readonly type: "bytes4";
    }, {
        readonly indexed: false;
        readonly internalType: "bytes32";
        readonly name: "oldMethod";
        readonly type: "bytes32";
    }, {
        readonly indexed: false;
        readonly internalType: "bytes32";
        readonly name: "newMethod";
        readonly type: "bytes32";
    }];
    readonly name: "ChangedSafeMethod";
    readonly type: "event";
}, {
    readonly anonymous: false;
    readonly inputs: readonly [{
        readonly indexed: true;
        readonly internalType: "contract ISafe";
        readonly name: "safe";
        readonly type: "address";
    }, {
        readonly indexed: false;
        readonly internalType: "bytes4";
        readonly name: "interfaceId";
        readonly type: "bytes4";
    }];
    readonly name: "RemovedInterface";
    readonly type: "event";
}, {
    readonly stateMutability: "nonpayable";
    readonly type: "fallback";
}, {
    readonly inputs: readonly [{
        readonly internalType: "bytes4";
        readonly name: "_interfaceId";
        readonly type: "bytes4";
    }, {
        readonly internalType: "bytes32[]";
        readonly name: "handlerWithSelectors";
        readonly type: "bytes32[]";
    }];
    readonly name: "addSupportedInterfaceBatch";
    readonly outputs: readonly [];
    readonly stateMutability: "nonpayable";
    readonly type: "function";
}, {
    readonly inputs: readonly [{
        readonly internalType: "contract ISafe";
        readonly name: "";
        readonly type: "address";
    }, {
        readonly internalType: "bytes32";
        readonly name: "";
        readonly type: "bytes32";
    }];
    readonly name: "domainVerifiers";
    readonly outputs: readonly [{
        readonly internalType: "contract ISafeSignatureVerifier";
        readonly name: "";
        readonly type: "address";
    }];
    readonly stateMutability: "view";
    readonly type: "function";
}, {
    readonly inputs: readonly [{
        readonly internalType: "bytes32";
        readonly name: "_hash";
        readonly type: "bytes32";
    }, {
        readonly internalType: "bytes";
        readonly name: "signature";
        readonly type: "bytes";
    }];
    readonly name: "isValidSignature";
    readonly outputs: readonly [{
        readonly internalType: "bytes4";
        readonly name: "magic";
        readonly type: "bytes4";
    }];
    readonly stateMutability: "view";
    readonly type: "function";
}, {
    readonly inputs: readonly [{
        readonly internalType: "address";
        readonly name: "";
        readonly type: "address";
    }, {
        readonly internalType: "address";
        readonly name: "";
        readonly type: "address";
    }, {
        readonly internalType: "uint256[]";
        readonly name: "";
        readonly type: "uint256[]";
    }, {
        readonly internalType: "uint256[]";
        readonly name: "";
        readonly type: "uint256[]";
    }, {
        readonly internalType: "bytes";
        readonly name: "";
        readonly type: "bytes";
    }];
    readonly name: "onERC1155BatchReceived";
    readonly outputs: readonly [{
        readonly internalType: "bytes4";
        readonly name: "";
        readonly type: "bytes4";
    }];
    readonly stateMutability: "view";
    readonly type: "function";
}, {
    readonly inputs: readonly [{
        readonly internalType: "address";
        readonly name: "";
        readonly type: "address";
    }, {
        readonly internalType: "address";
        readonly name: "";
        readonly type: "address";
    }, {
        readonly internalType: "uint256";
        readonly name: "";
        readonly type: "uint256";
    }, {
        readonly internalType: "uint256";
        readonly name: "";
        readonly type: "uint256";
    }, {
        readonly internalType: "bytes";
        readonly name: "";
        readonly type: "bytes";
    }];
    readonly name: "onERC1155Received";
    readonly outputs: readonly [{
        readonly internalType: "bytes4";
        readonly name: "";
        readonly type: "bytes4";
    }];
    readonly stateMutability: "view";
    readonly type: "function";
}, {
    readonly inputs: readonly [{
        readonly internalType: "address";
        readonly name: "";
        readonly type: "address";
    }, {
        readonly internalType: "address";
        readonly name: "";
        readonly type: "address";
    }, {
        readonly internalType: "uint256";
        readonly name: "";
        readonly type: "uint256";
    }, {
        readonly internalType: "bytes";
        readonly name: "";
        readonly type: "bytes";
    }];
    readonly name: "onERC721Received";
    readonly outputs: readonly [{
        readonly internalType: "bytes4";
        readonly name: "";
        readonly type: "bytes4";
    }];
    readonly stateMutability: "view";
    readonly type: "function";
}, {
    readonly inputs: readonly [{
        readonly internalType: "bytes4";
        readonly name: "_interfaceId";
        readonly type: "bytes4";
    }, {
        readonly internalType: "bytes4[]";
        readonly name: "selectors";
        readonly type: "bytes4[]";
    }];
    readonly name: "removeSupportedInterfaceBatch";
    readonly outputs: readonly [];
    readonly stateMutability: "nonpayable";
    readonly type: "function";
}, {
    readonly inputs: readonly [{
        readonly internalType: "contract ISafe";
        readonly name: "";
        readonly type: "address";
    }, {
        readonly internalType: "bytes4";
        readonly name: "";
        readonly type: "bytes4";
    }];
    readonly name: "safeInterfaces";
    readonly outputs: readonly [{
        readonly internalType: "bool";
        readonly name: "";
        readonly type: "bool";
    }];
    readonly stateMutability: "view";
    readonly type: "function";
}, {
    readonly inputs: readonly [{
        readonly internalType: "contract ISafe";
        readonly name: "";
        readonly type: "address";
    }, {
        readonly internalType: "bytes4";
        readonly name: "";
        readonly type: "bytes4";
    }];
    readonly name: "safeMethods";
    readonly outputs: readonly [{
        readonly internalType: "bytes32";
        readonly name: "";
        readonly type: "bytes32";
    }];
    readonly stateMutability: "view";
    readonly type: "function";
}, {
    readonly inputs: readonly [{
        readonly internalType: "bytes32";
        readonly name: "domainSeparator";
        readonly type: "bytes32";
    }, {
        readonly internalType: "contract ISafeSignatureVerifier";
        readonly name: "newVerifier";
        readonly type: "address";
    }];
    readonly name: "setDomainVerifier";
    readonly outputs: readonly [];
    readonly stateMutability: "nonpayable";
    readonly type: "function";
}, {
    readonly inputs: readonly [{
        readonly internalType: "bytes4";
        readonly name: "selector";
        readonly type: "bytes4";
    }, {
        readonly internalType: "bytes32";
        readonly name: "newMethod";
        readonly type: "bytes32";
    }];
    readonly name: "setSafeMethod";
    readonly outputs: readonly [];
    readonly stateMutability: "nonpayable";
    readonly type: "function";
}, {
    readonly inputs: readonly [{
        readonly internalType: "bytes4";
        readonly name: "interfaceId";
        readonly type: "bytes4";
    }, {
        readonly internalType: "bool";
        readonly name: "supported";
        readonly type: "bool";
    }];
    readonly name: "setSupportedInterface";
    readonly outputs: readonly [];
    readonly stateMutability: "nonpayable";
    readonly type: "function";
}, {
    readonly inputs: readonly [{
        readonly internalType: "bytes4";
        readonly name: "interfaceId";
        readonly type: "bytes4";
    }];
    readonly name: "supportsInterface";
    readonly outputs: readonly [{
        readonly internalType: "bool";
        readonly name: "";
        readonly type: "bool";
    }];
    readonly stateMutability: "view";
    readonly type: "function";
}];
/**
 * Represents the ABI of the ExtensibleFallbackHandler contract version 1.5.0.
 *
 * @type {ExtensibleFallbackHandlerContract_v1_5_0_Abi}
 */
export type ExtensibleFallbackHandlerContract_v1_5_0_Abi = typeof extensibleFallbackHandlerContract_v1_5_0_AbiTypes;
/**
 * Represents the function type derived by the given function name from the ExtensibleFallbackHandler contract version 1.5.0 ABI.
 *
 * @template ContractFunctionName - The function name, derived from the ABI.
 * @type {ExtensibleFallbackHandlerContract_v1_5_0_Function}
 */
export type ExtensibleFallbackHandlerContract_v1_5_0_Function<ContractFunctionName extends ExtractAbiFunctionNames<ExtensibleFallbackHandlerContract_v1_5_0_Abi>> = ContractFunction<ExtensibleFallbackHandlerContract_v1_5_0_Abi, ContractFunctionName>;
/**
 * Represents the contract type for an ExtensibleFallbackHandler contract version 1.5.0 defining read and write methods.
 * Utilizes the generic ExtensibleFallbackHandlerBaseContract with the ABI specific to version 1.5.0.
 *
 * @type {ExtensibleFallbackHandlerContract_v1_5_0_Contract}
 */
export type ExtensibleFallbackHandlerContract_v1_5_0_Contract = ExtensibleFallbackHandlerBaseContract<ExtensibleFallbackHandlerContract_v1_5_0_Abi>;
export {};
//# sourceMappingURL=ExtensibleFallbackHandlerContract_v1_5_0.d.ts.map