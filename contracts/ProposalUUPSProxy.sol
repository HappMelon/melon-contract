// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./ProposalLogic.sol";
import "@openzeppelin/contracts/proxy/Proxy.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
// import "@openzeppelin/contracts/access/Ownable.sol";

contract ProposalUUPSProxy is Proxy {
    // 类型声明
    // 提案
    struct Proposal {
        address proposer; // 提案发起人
        string description; // 提案描述
        uint256 stakeAmount; // 质押代币数量
        bool active; // 提案是否活跃
        bool isSettled; // 添加属性以跟踪提案是否已结算
        bool isWagered;
        uint256 endTime;
    }
    // 提议选项
    struct Option {
        string description; // 选项描述
        uint256 voteCount; // 投票计数
    }
    struct Vote {
        address user;
        uint256 amount;
    }

    //事件
    event Received(address caller, uint amount, string message);
    event Deposited(address indexed user, uint amount);
    event Withdrawn(address indexed user, uint amount);
    event Voted(
        address indexed _address,
        uint256 indexed _proposalId,
        uint256 indexed _optionId,
        uint256 _amount
    );
    event ProposalAndOptionsSubmitted(
        address indexed user,
        uint256 indexed proposalIndex,
        string proposalDescription,
        string[] optionDescriptions,
        uint256 endtime
    );
    event DepositForProposal(
        address indexed staker,
        uint256 amount,
        bool staked,
        uint256 unlockTime,
        uint256 indexed stakeIndex
    );
    event TokensStaked(
        address indexed user,
        uint256 amount,
        bool isForProposal
    );
    event FundsSettledForAverageQuality(
        uint256 indexed proposalId,
        address indexed proposer,
        uint256 amountToReturn
    );
    event WithdrawalDetailed(
        address indexed user,
        uint256 amountWithdrawn,
        uint256 balanceAfterWithdrawal
    );
    event UnlockTimeUpdated(
        address indexed staker,
        uint256 indexed stakeIndex,
        uint256 newUnlockTime
    );
    event FundsPenalizedForNonCompliance(
        uint256 indexed proposalId,
        address indexed proposer,
        uint256 penalty
    );
    event ProposalStatusChanged(uint256 proposalId, bool isActive);
    event ProposalEndTime(uint256 _proposalId, uint256 endTime);
    event CreateProposal(
        address indexed user,
        uint256 indexed id,
        string description,
        uint256 amount,
        string[] options,
        uint256 endtime
    );
    event StakeReleased(
        address indexed user,
        uint256 stakeIndex,
        bool penalized,
        uint256 amountReleased
    );
    event ProposalEnded(uint256 indexed proposalId, bool isActive);
    event ProposalConcluded(uint256 indexed proposalId, bool isActive);
    event RewardDistributed(
        address indexed voter,
        uint256 proposalId,
        uint256 amount,
        bool isWinner
    );
    event ExchangePoints(address indexed user, uint256 points);
    // 提案原路退回质押金额
    event ProposalRefunded(uint256 indexed proposalId, uint256 winningOptionId);

    // 错误
    error UnsettledProposal(uint proposalId, bool isSettle);
    error UserNotVoted();
    error InsufficientBalance(address user, uint availableBalance);

    // state variable
    address public logicAddress;
    address public flareToken; // Token Address
    using Counters for Counters.Counter;
    Proposal[] public proposals; // Proposal array

    mapping(address => uint256) public balances;
    mapping(uint256 => Option[]) public proposalOptions; // Proposal options
    mapping(address => uint256) public proposalDeposit; // The amount at which the user initiates a proposal
    mapping(address => uint256) public votingDeposit; // The amount voted by the user
    mapping(uint => mapping(uint => Vote[])) public votingRecordsforProposals;
    mapping(uint256 => uint) public winningOptionByProposal; // Record the winning options for settled proposals
    mapping(uint => mapping(address => int))
        public rewardOrPenaltyInSettledProposal; // Record rewards or punishments for settlement proposal users

    constructor(address implementation, address myToken) {
        logicAddress = implementation;
        flareToken = myToken;
    }

    function _implementation() internal view override returns (address) {
        return logicAddress;
    }
}
