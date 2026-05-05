/**
 * RewardDistributor ABI
 * Auto-generated from smart-contracts/abis/frontend/RewardDistributor.json
 * DO NOT EDIT MANUALLY - This file is auto-generated
 */

export default {
  abi: [
  {
    "type": "constructor",
    "payable": false,
    "inputs": []
  },
  {
    "type": "error",
    "name": "RewardDistributor__EmergencyModeActive",
    "inputs": []
  },
  {
    "type": "error",
    "name": "RewardDistributor__EmergencyModeRequired",
    "inputs": []
  },
  {
    "type": "error",
    "name": "RewardDistributor__EmergencyOnly",
    "inputs": []
  },
  {
    "type": "error",
    "name": "RewardDistributor__InsufficientAllowance",
    "inputs": []
  },
  {
    "type": "error",
    "name": "RewardDistributor__InsufficientBalance",
    "inputs": []
  },
  {
    "type": "error",
    "name": "RewardDistributor__InvalidAddress",
    "inputs": []
  },
  {
    "type": "error",
    "name": "RewardDistributor__InvalidAmount",
    "inputs": []
  },
  {
    "type": "error",
    "name": "RewardDistributor__InvalidLength",
    "inputs": []
  },
  {
    "type": "error",
    "name": "RewardDistributor__InvalidReason",
    "inputs": []
  },
  {
    "type": "error",
    "name": "RewardDistributor__InvalidReceiver",
    "inputs": []
  },
  {
    "type": "error",
    "name": "RewardDistributor__InvalidSpender",
    "inputs": []
  },
  {
    "type": "error",
    "name": "RewardDistributor__InvalidTarget",
    "inputs": []
  },
  {
    "type": "error",
    "name": "RewardDistributor__InvalidToken",
    "inputs": []
  },
  {
    "type": "error",
    "name": "RewardDistributor__SpenderNotApproved",
    "inputs": []
  },
  {
    "type": "error",
    "name": "RewardDistributor__TransactionFailed",
    "inputs": []
  },
  {
    "type": "event",
    "anonymous": false,
    "name": "AllowanceRefreshed",
    "inputs": [
      {
        "type": "address",
        "name": "token",
        "indexed": true
      },
      {
        "type": "address",
        "name": "spender",
        "indexed": true
      },
      {
        "type": "uint256",
        "name": "newAllowance",
        "indexed": false
      }
    ]
  },
  {
    "type": "event",
    "anonymous": false,
    "name": "AllowanceThresholdUpdated",
    "inputs": [
      {
        "type": "uint256",
        "name": "oldThreshold",
        "indexed": false
      },
      {
        "type": "uint256",
        "name": "newThreshold",
        "indexed": false
      }
    ]
  },
  {
    "type": "event",
    "anonymous": false,
    "name": "AllowedSelectorUpdated",
    "inputs": [
      {
        "type": "bytes4",
        "name": "selector",
        "indexed": true
      },
      {
        "type": "bool",
        "name": "allowed",
        "indexed": false
      }
    ]
  },
  {
    "type": "event",
    "anonymous": false,
    "name": "AllowedTargetUpdated",
    "inputs": [
      {
        "type": "address",
        "name": "target",
        "indexed": true
      },
      {
        "type": "bool",
        "name": "allowed",
        "indexed": false
      }
    ]
  },
  {
    "type": "event",
    "anonymous": false,
    "name": "BatchApprovalCompleted",
    "inputs": [
      {
        "type": "address",
        "name": "token",
        "indexed": true
      },
      {
        "type": "uint256",
        "name": "spenderCount",
        "indexed": false
      }
    ]
  },
  {
    "type": "event",
    "anonymous": false,
    "name": "EmergencyModeDisabled",
    "inputs": []
  },
  {
    "type": "event",
    "anonymous": false,
    "name": "EmergencyModeEnabled",
    "inputs": []
  },
  {
    "type": "event",
    "anonymous": false,
    "name": "EmergencyTransfer",
    "inputs": [
      {
        "type": "address",
        "name": "token",
        "indexed": true
      },
      {
        "type": "address",
        "name": "to",
        "indexed": true
      },
      {
        "type": "uint256",
        "name": "amount",
        "indexed": false
      },
      {
        "type": "string",
        "name": "reason",
        "indexed": false
      }
    ]
  },
  {
    "type": "event",
    "anonymous": false,
    "name": "ExecTransaction",
    "inputs": [
      {
        "type": "address",
        "name": "from",
        "indexed": false
      },
      {
        "type": "address",
        "name": "excutionContract",
        "indexed": false
      },
      {
        "type": "uint256",
        "name": "value",
        "indexed": false
      },
      {
        "type": "bytes",
        "name": "data",
        "indexed": false
      }
    ]
  },
  {
    "type": "event",
    "anonymous": false,
    "name": "Initialized",
    "inputs": [
      {
        "type": "uint8",
        "name": "version",
        "indexed": false
      }
    ]
  },
  {
    "type": "event",
    "anonymous": false,
    "name": "OwnershipTransferred",
    "inputs": [
      {
        "type": "address",
        "name": "previousOwner",
        "indexed": true
      },
      {
        "type": "address",
        "name": "newOwner",
        "indexed": true
      }
    ]
  },
  {
    "type": "event",
    "anonymous": false,
    "name": "Paused",
    "inputs": [
      {
        "type": "address",
        "name": "account",
        "indexed": false
      }
    ]
  },
  {
    "type": "event",
    "anonymous": false,
    "name": "TransactionExecuted",
    "inputs": [
      {
        "type": "address",
        "name": "target",
        "indexed": true
      },
      {
        "type": "uint256",
        "name": "value",
        "indexed": false
      },
      {
        "type": "bytes",
        "name": "data",
        "indexed": false
      }
    ]
  },
  {
    "type": "event",
    "anonymous": false,
    "name": "Unpaused",
    "inputs": [
      {
        "type": "address",
        "name": "account",
        "indexed": false
      }
    ]
  },
  {
    "type": "function",
    "name": "__RewardDistributor_init",
    "constant": false,
    "payable": false,
    "gas": 5000000,
    "inputs": [
      {
        "type": "uint256",
        "name": "_allowanceThreshold"
      }
    ],
    "outputs": []
  },
  {
    "type": "function",
    "name": "allowanceThreshold",
    "constant": true,
    "stateMutability": "view",
    "payable": false,
    "gas": 5000000,
    "inputs": [],
    "outputs": [
      {
        "type": "uint256"
      }
    ]
  },
  {
    "type": "function",
    "name": "approveERC20",
    "constant": false,
    "payable": false,
    "gas": 5000000,
    "inputs": [
      {
        "type": "address",
        "name": "token"
      },
      {
        "type": "address",
        "name": "spender"
      },
      {
        "type": "uint256",
        "name": "amount"
      }
    ],
    "outputs": []
  },
  {
    "type": "function",
    "name": "approvedSpenders",
    "constant": true,
    "stateMutability": "view",
    "payable": false,
    "gas": 5000000,
    "inputs": [
      {
        "type": "address"
      },
      {
        "type": "address"
      }
    ],
    "outputs": [
      {
        "type": "bool"
      }
    ]
  },
  {
    "type": "function",
    "name": "batchApproveERC20",
    "constant": false,
    "payable": false,
    "gas": 5000000,
    "inputs": [
      {
        "type": "address",
        "name": "token"
      },
      {
        "type": "address[]",
        "name": "spenders"
      },
      {
        "type": "uint256[]",
        "name": "amounts"
      }
    ],
    "outputs": []
  },
  {
    "type": "function",
    "name": "disableEmergencyMode",
    "constant": false,
    "payable": false,
    "gas": 5000000,
    "inputs": [],
    "outputs": []
  },
  {
    "type": "function",
    "name": "emergencyMode",
    "constant": true,
    "stateMutability": "view",
    "payable": false,
    "gas": 5000000,
    "inputs": [],
    "outputs": [
      {
        "type": "bool"
      }
    ]
  },
  {
    "type": "function",
    "name": "emergencyTransfer",
    "constant": false,
    "payable": false,
    "gas": 5000000,
    "inputs": [
      {
        "type": "address",
        "name": "token"
      },
      {
        "type": "address",
        "name": "to"
      },
      {
        "type": "uint256",
        "name": "amount"
      },
      {
        "type": "string",
        "name": "reason"
      }
    ],
    "outputs": []
  },
  {
    "type": "function",
    "name": "enableEmergencyMode",
    "constant": false,
    "payable": false,
    "gas": 5000000,
    "inputs": [],
    "outputs": []
  },
  {
    "type": "function",
    "name": "getAllowanceStatus",
    "constant": true,
    "stateMutability": "view",
    "payable": false,
    "gas": 5000000,
    "inputs": [
      {
        "type": "address",
        "name": "token"
      },
      {
        "type": "address[]",
        "name": "spenders"
      }
    ],
    "outputs": [
      {
        "type": "uint256[]",
        "name": "allowances"
      },
      {
        "type": "bool[]",
        "name": "needsRefresh"
      }
    ]
  },
  {
    "type": "function",
    "name": "getDetailedStatus",
    "constant": true,
    "stateMutability": "view",
    "payable": false,
    "gas": 5000000,
    "inputs": [
      {
        "type": "address",
        "name": "token"
      },
      {
        "type": "address",
        "name": "spender"
      }
    ],
    "outputs": [
      {
        "type": "uint256",
        "name": "balance"
      },
      {
        "type": "uint256",
        "name": "allowance"
      },
      {
        "type": "bool",
        "name": "isPaused"
      },
      {
        "type": "bool",
        "name": "isEmergencyMode"
      },
      {
        "type": "bool",
        "name": "isApprovedSpender"
      },
      {
        "type": "bool",
        "name": "needsAllowanceRefresh"
      }
    ]
  },
  {
    "type": "function",
    "name": "isSystemReady",
    "constant": true,
    "stateMutability": "view",
    "payable": false,
    "gas": 5000000,
    "inputs": [
      {
        "type": "address",
        "name": "token"
      },
      {
        "type": "address",
        "name": "spender"
      },
      {
        "type": "uint256",
        "name": "requiredAmount"
      }
    ],
    "outputs": [
      {
        "type": "bool",
        "name": "ready"
      },
      {
        "type": "string",
        "name": "reason"
      }
    ]
  },
  {
    "type": "function",
    "name": "owner",
    "constant": true,
    "stateMutability": "view",
    "payable": false,
    "gas": 5000000,
    "inputs": [],
    "outputs": [
      {
        "type": "address"
      }
    ]
  },
  {
    "type": "function",
    "name": "pause",
    "constant": false,
    "payable": false,
    "gas": 5000000,
    "inputs": [],
    "outputs": []
  },
  {
    "type": "function",
    "name": "paused",
    "constant": true,
    "stateMutability": "view",
    "payable": false,
    "gas": 5000000,
    "inputs": [],
    "outputs": [
      {
        "type": "bool"
      }
    ]
  },
  {
    "type": "function",
    "name": "refreshAllowanceIfNeeded",
    "constant": false,
    "payable": false,
    "gas": 5000000,
    "inputs": [
      {
        "type": "address",
        "name": "token"
      },
      {
        "type": "address",
        "name": "spender"
      },
      {
        "type": "uint256",
        "name": "requiredAmount"
      }
    ],
    "outputs": []
  },
  {
    "type": "function",
    "name": "renounceOwnership",
    "constant": false,
    "payable": false,
    "gas": 5000000,
    "inputs": [],
    "outputs": []
  },
  {
    "type": "function",
    "name": "setAllowanceThreshold",
    "constant": false,
    "payable": false,
    "gas": 5000000,
    "inputs": [
      {
        "type": "uint256",
        "name": "_threshold"
      }
    ],
    "outputs": []
  },
  {
    "type": "function",
    "name": "transferOwnership",
    "constant": false,
    "payable": false,
    "gas": 5000000,
    "inputs": [
      {
        "type": "address",
        "name": "newOwner"
      }
    ],
    "outputs": []
  },
  {
    "type": "function",
    "name": "unpause",
    "constant": false,
    "payable": false,
    "gas": 5000000,
    "inputs": [],
    "outputs": []
  },
  {
    "type": "function",
    "name": "withdrawERC20",
    "constant": false,
    "payable": false,
    "gas": 5000000,
    "inputs": [
      {
        "type": "address",
        "name": "token"
      },
      {
        "type": "address",
        "name": "receiver"
      },
      {
        "type": "uint256",
        "name": "amount"
      }
    ],
    "outputs": []
  }
],
} as const;
