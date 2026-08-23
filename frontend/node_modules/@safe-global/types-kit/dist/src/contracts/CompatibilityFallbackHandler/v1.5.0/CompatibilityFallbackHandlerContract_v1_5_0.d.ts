import { ExtractAbiFunctionNames } from 'abitype';
import CompatibilityFallbackHandlerBaseContract from '../CompatibilityFallbackHandlerBaseContract';
import { ContractFunction } from '../../common/BaseContract';
declare const compatibilityFallbackHandlerContract_v1_5_0_AbiTypes: readonly [{
    readonly inputs: readonly [{
        readonly internalType: "contract ISafe";
        readonly name: "safe";
        readonly type: "address";
    }, {
        readonly internalType: "bytes";
        readonly name: "message";
        readonly type: "bytes";
    }];
    readonly name: "encodeMessageDataForSafe";
    readonly outputs: readonly [{
        readonly internalType: "bytes";
        readonly name: "";
        readonly type: "bytes";
    }];
    readonly stateMutability: "view";
    readonly type: "function";
}, {
    readonly inputs: readonly [{
        readonly internalType: "address";
        readonly name: "to";
        readonly type: "address";
    }, {
        readonly internalType: "uint256";
        readonly name: "value";
        readonly type: "uint256";
    }, {
        readonly internalType: "bytes";
        readonly name: "data";
        readonly type: "bytes";
    }, {
        readonly internalType: "enum Enum.Operation";
        readonly name: "operation";
        readonly type: "uint8";
    }, {
        readonly internalType: "uint256";
        readonly name: "safeTxGas";
        readonly type: "uint256";
    }, {
        readonly internalType: "uint256";
        readonly name: "baseGas";
        readonly type: "uint256";
    }, {
        readonly internalType: "uint256";
        readonly name: "gasPrice";
        readonly type: "uint256";
    }, {
        readonly internalType: "address";
        readonly name: "gasToken";
        readonly type: "address";
    }, {
        readonly internalType: "address";
        readonly name: "refundReceiver";
        readonly type: "address";
    }, {
        readonly internalType: "uint256";
        readonly name: "nonce";
        readonly type: "uint256";
    }];
    readonly name: "encodeTransactionData";
    readonly outputs: readonly [{
        readonly internalType: "bytes";
        readonly name: "";
        readonly type: "bytes";
    }];
    readonly stateMutability: "view";
    readonly type: "function";
}, {
    readonly inputs: readonly [{
        readonly internalType: "bytes";
        readonly name: "message";
        readonly type: "bytes";
    }];
    readonly name: "getMessageHash";
    readonly outputs: readonly [{
        readonly internalType: "bytes32";
        readonly name: "";
        readonly type: "bytes32";
    }];
    readonly stateMutability: "view";
    readonly type: "function";
}, {
    readonly inputs: readonly [{
        readonly internalType: "contract ISafe";
        readonly name: "safe";
        readonly type: "address";
    }, {
        readonly internalType: "bytes";
        readonly name: "message";
        readonly type: "bytes";
    }];
    readonly name: "getMessageHashForSafe";
    readonly outputs: readonly [{
        readonly internalType: "bytes32";
        readonly name: "";
        readonly type: "bytes32";
    }];
    readonly stateMutability: "view";
    readonly type: "function";
}, {
    readonly inputs: readonly [];
    readonly name: "getModules";
    readonly outputs: readonly [{
        readonly internalType: "address[]";
        readonly name: "";
        readonly type: "address[]";
    }];
    readonly stateMutability: "view";
    readonly type: "function";
}, {
    readonly inputs: readonly [{
        readonly internalType: "bytes32";
        readonly name: "_dataHash";
        readonly type: "bytes32";
    }, {
        readonly internalType: "bytes";
        readonly name: "_signature";
        readonly type: "bytes";
    }];
    readonly name: "isValidSignature";
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
        readonly internalType: "address";
        readonly name: "targetContract";
        readonly type: "address";
    }, {
        readonly internalType: "bytes";
        readonly name: "calldataPayload";
        readonly type: "bytes";
    }];
    readonly name: "simulate";
    readonly outputs: readonly [{
        readonly internalType: "bytes";
        readonly name: "response";
        readonly type: "bytes";
    }];
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
    }, {
        readonly internalType: "bytes";
        readonly name: "";
        readonly type: "bytes";
    }];
    readonly name: "tokensReceived";
    readonly outputs: readonly [];
    readonly stateMutability: "pure";
    readonly type: "function";
}];
/**
 * Represents the ABI of the CompatibilityFallbackHandler contract version 1.5.0.
 *
 * @type {CompatibilityFallbackHandlerContract_v1_5_0_Abi}
 */
export type CompatibilityFallbackHandlerContract_v1_5_0_Abi = typeof compatibilityFallbackHandlerContract_v1_5_0_AbiTypes;
/**
 * Represents the function type derived by the given function name from the CompatibilityFallbackHandler contract version 1.5.0 ABI.
 *
 * @template ContractFunctionName - The function name, derived from the ABI.
 * @type {CompatibilityFallbackHandlerContract_v1_5_0_Function}
 */
export type CompatibilityFallbackHandlerContract_v1_5_0_Function<ContractFunctionName extends ExtractAbiFunctionNames<CompatibilityFallbackHandlerContract_v1_5_0_Abi>> = ContractFunction<CompatibilityFallbackHandlerContract_v1_5_0_Abi, ContractFunctionName>;
/**
 * Represents the contract type for a CompatibilityFallbackHandler contract version 1.5.0 defining read and write methods.
 * Utilizes the generic CompatibilityFallbackHandlerBaseContract with the ABI specific to version 1.5.0.
 *
 * @type {CompatibilityFallbackHandlerContract_v1_5_0_Contract}
 */
export type CompatibilityFallbackHandlerContract_v1_5_0_Contract = CompatibilityFallbackHandlerBaseContract<CompatibilityFallbackHandlerContract_v1_5_0_Abi> & {
    /**
     * New in v1.5.0: encodeTransactionData was moved from the Safe contract to CompatibilityFallbackHandler
     * to preserve backwards compatibility for existing integrations.
     * @param args - Array[to, value, data, operation, safeTxGas, baseGas, gasPrice, gasToken, refundReceiver, nonce]
     * @returns Array[encodedData]
     */
    encodeTransactionData: CompatibilityFallbackHandlerContract_v1_5_0_Function<'encodeTransactionData'>;
};
export {};
//# sourceMappingURL=CompatibilityFallbackHandlerContract_v1_5_0.d.ts.map