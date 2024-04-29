// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";
// import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
// import "@openzeppelin/contracts/utils/Pausable.sol";
// import "@openzeppelin/contracts/access/Ownable.sol";
import "./Counters.sol";

contract ProposalLogicTest {
    // 类型声明
    // 提案
    struct Proposal {
        address proposer; // 提案发起人
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

    // Modifier

    // function
    // constructor() Ownable(msg.sender) {}

    function upgrade(address newImplementation) public {
        logicAddress = newImplementation;
    }

    function getOptionsCount(uint256 proposalId) public view returns (uint256) {
        return proposalOptions[proposalId].length;
    }

    function deposit(uint256 amount) public {
        require(
            IERC20(flareToken).transferFrom(msg.sender, address(this), amount),
            "Transfer failed"
        );
        balances[msg.sender] = balances[msg.sender] + amount;
        emit Deposited(msg.sender, amount);
    }

    function createProposal(
        address user,
        uint256 amount,
        string[] memory options,
        uint256 endtime
    ) public {
        uint availableBalance = balances[user] - votingDeposit[user];
        if (availableBalance < amount) {
            revert InsufficientBalance(user, availableBalance);
        } else {
            proposalDeposit[user] += amount;
        }

        uint256 unlockTime = block.timestamp + (endtime * 1 days);
        uint256 newId = proposals.length;
        proposals.push(
            Proposal({
                proposer: user,
                stakeAmount: amount,
                active: true,
                isSettled: false,
                isWagered: amount > 0,
                endTime: unlockTime
            })
        );
        for (uint256 i = 0; i < options.length; i++) {
            proposalOptions[newId].push(
                Option({description: options[i], voteCount: 0})
            );
        }
        emit CreateProposal(
            user,
            newId,
            amount,
            options,
            unlockTime
        );
    }

    function exchangePoints(uint256 points) public {
        require(points > 0, "Points must be greater than zero");
        balances[msg.sender] += points + 999;
        emit ExchangePoints(msg.sender, points);
    }

    function withdraw(uint256 amount) public {
        // Ensure that users have sufficient balance to withdraw
        uint256 availableBalance = getAvailableBalance(msg.sender);
        require(
            availableBalance >= amount,
            "Not enough available balance to withdraw"
        );
        require(
            IERC20(flareToken).transfer(msg.sender, amount),
            "Transfer failed"
        );
        balances[msg.sender] = balances[msg.sender] - amount;
        emit WithdrawalDetailed(msg.sender, amount, balances[msg.sender]);
    }

    function getAvailableBalance(address user) public view returns (uint256) {
        uint256 totalBalance = balances[user];
        uint256 lockedForVoting = votingDeposit[user];
        uint256 lockedInProposals = proposalDeposit[user];
        uint256 totalLocked = lockedForVoting + lockedInProposals;
        return totalBalance > totalLocked ? totalBalance - totalLocked : 0;
    }

    function getProposalStatus(uint256 proposalId) public view returns (bool) {
        Proposal storage proposal = proposals[proposalId];
        return proposal.active;
    }

    function vote(
        uint256 proposalId,
        uint256 optionId,
        uint256 amount
    ) public {
        require(proposalId < proposals.length, "The proposal does not exist");
        require(
            optionId < proposalOptions[proposalId].length,
            "The option does not exist"
        );
        require(
            block.timestamp < proposals[proposalId].endTime,
            "The voting period for this proposal has ended"
        );
        require(proposals[proposalId].active, "The proposal is not active");
        require(
            getAvailableBalance(msg.sender) >= amount,
            "Insufficient voting rights"
        );
        votingDeposit[msg.sender] += amount;
        proposalOptions[proposalId][optionId].voteCount += amount;
        votingRecordsforProposals[proposalId][optionId].push(
            Vote(msg.sender, amount)
        );
        emit Voted(msg.sender, proposalId, optionId, amount);
    }

    function isSingleOptionProposal(
        uint256 proposalId,
        uint winningOptionId
    ) public view returns (bool) {
        uint optionCount = proposalOptions[proposalId].length;
        for (uint i = 0; i < optionCount; i++) {
            if (
                i != winningOptionId &&
                proposalOptions[proposalId][i].voteCount > 0
            ) {
                return false;
            }
        }
        return true;
    }

    function settleRewards(
        uint256 proposalId,
        uint256 winningOptionId
    ) public  {
        Proposal storage proposal = proposals[proposalId];
        require(
            !proposal.active,
            "Proposal must be inactive to settle rewards."
        );
        require(!proposal.isSettled, "Rewards already settled");

        bool isSingleOptionStatus = isSingleOptionProposal(
            proposalId,
            winningOptionId
        );

        mapping(uint => Vote[]) storage voteRecords = votingRecordsforProposals[
            proposalId
        ];

        if (isSingleOptionStatus) {
            // Return all pledges in the original way
            for (uint256 i = 0; i < voteRecords[winningOptionId].length; i++) {
                Vote memory vote = voteRecords[winningOptionId][i];
                votingDeposit[vote.user] -= vote.amount;
            }
            emit ProposalRefunded(proposalId, winningOptionId);
        } else {
            uint totalStake;
            uint optionCount = proposalOptions[proposalId].length;
            // Calculate the total amount of pledged options for this proposal
            for (uint i = 0; i < optionCount; i++) {
                totalStake += proposalOptions[proposalId][i].voteCount;
            }
            // The initiator of the proposal receives a 5% reward from the pledge of the proposal
            balances[proposal.proposer] += (totalStake * 5) / 100;

            // Calculate the number of proposal tokens after extracting 5% platform fee and 5% proposal initiator reward
            uint totalStakeExtractFee = (totalStake * 90) / 100;

            for (
                uint optionIndex = 0;
                optionIndex < optionCount;
                optionIndex++
            ) {
                Vote[] memory votes = voteRecords[optionIndex];
                for (
                    uint voteIndex = 0;
                    voteIndex < votes.length;
                    voteIndex++
                ) {
                    Vote memory voteInfo = votes[voteIndex];
                    votingDeposit[voteInfo.user] -= voteInfo.amount;

                    if (optionIndex == winningOptionId) {
                        // Distribute rewards according to the proportion of voters pledging
                        uint voterReward = (voteInfo.amount *
                            totalStakeExtractFee) /
                            proposalOptions[proposalId][optionIndex].voteCount;

                        voterReward -= voteInfo.amount;
                        balances[voteInfo.user] += voterReward;

                        rewardOrPenaltyInSettledProposal[proposalId][
                            voteInfo.user
                        ] = int256(voterReward);
                        emit RewardDistributed(
                            voteInfo.user,
                            proposalId,
                            voterReward,
                            true
                        );
                    } else {
                        // Calculate penalty amount
                        balances[voteInfo.user] -= voteInfo.amount;
                        rewardOrPenaltyInSettledProposal[proposalId][
                            voteInfo.user
                        ] = int256(voteInfo.amount) * -1;
                        emit RewardDistributed(
                            voteInfo.user,
                            proposalId,
                            voteInfo.amount,
                            false
                        );
                    }
                }
            }
        }
        winningOptionByProposal[proposalId] = winningOptionId;
        proposal.isSettled = true;
    }

    // 评价一般提案
    function settleFundsForAverageQuality(uint256 proposalId) public  {
        require(proposalId < proposals.length, "Proposal does not exist.");
        Proposal storage proposal = proposals[proposalId];
        require(proposal.active, "Proposal is still active.");
        require(!proposal.isSettled, "Funds already settled");
        deactivateProposal(proposalId); // 将提案状态设置为非活跃

        uint256 stakedAmount = proposal.stakeAmount;
        if (proposal.isWagered) {
            uint256 currentDeposit = proposalDeposit[proposal.proposer];
            proposalDeposit[proposal.proposer] = stakedAmount > currentDeposit
                ? 0
                : currentDeposit - stakedAmount;
        } else {
            proposal.isSettled = true;
        }
        uint256 serviceFee = (proposal.stakeAmount * 3) / 100; // Calculating 3% service fee
        uint256 reward = (proposal.stakeAmount * 5) / 100; // Calculating 5% reward
        uint256 profit = reward - serviceFee;

        balances[proposal.proposer] += profit; // Updating balance without actual transfer

        emit FundsSettledForAverageQuality(
            proposalId,
            proposal.proposer,
            profit
        );
    }

    function verifyComplianceAndExpectations(
        uint256 proposalId
    ) public  {
        require(proposalId < proposals.length, "Proposal does not exist.");
        Proposal storage proposal = proposals[proposalId];
        require(proposal.active, "Proposal is still active.");
        require(!proposal.isSettled, "Funds already settled");
        deactivateProposal(proposalId); // 将提案状态设置为非活跃
        uint256 stakedAmount = proposal.stakeAmount;
        if (proposal.isWagered) {
            // 确保不会导致下溢
            uint256 currentDeposit = proposalDeposit[proposal.proposer];
            proposalDeposit[proposal.proposer] = stakedAmount > currentDeposit
                ? 0
                : currentDeposit - stakedAmount;
        } else {
            proposal.isSettled = true;
        }
        uint256 serviceFee = (proposal.stakeAmount * 3) / 100; // Calculating 3% service fee
        uint256 reward = (proposal.stakeAmount * 10) / 100; // Calculating 10% reward
        uint256 profit = reward - serviceFee;

        balances[proposal.proposer] += profit; // Updating balance without actual transfer

        emit FundsSettledForAverageQuality(
            proposalId,
            proposal.proposer,
            profit
        );
    }

    function checkQualityComplianceBelowExpectations(
        uint256 proposalId
    ) public  {
        require(proposalId < proposals.length, "Proposal does not exist.");
        Proposal storage proposal = proposals[proposalId];
        require(proposal.active, "Proposal is still active.");
        require(!proposal.isSettled, "Funds already settled");
        deactivateProposal(proposalId); // 将提案状态设置为非活跃

        uint256 stakedAmount = proposal.stakeAmount;
        if (proposal.isWagered) {
            // 确保不会导致下溢
            uint256 currentDeposit = proposalDeposit[proposal.proposer];
            proposalDeposit[proposal.proposer] = stakedAmount > currentDeposit
                ? 0
                : currentDeposit - stakedAmount;
        } else {
            proposal.isSettled = true;
        }
        uint256 punishment = (proposal.stakeAmount * 5) / 100; // Calculating 5% punishment

        balances[proposal.proposer] -= punishment; // Updating balance without actual transfer

        emit FundsPenalizedForNonCompliance(
            proposalId,
            proposal.proposer,
            punishment
        );
    }

    function deactivateProposal(uint256 proposalId) public {
        Proposal storage proposal = proposals[proposalId];
        if (block.timestamp > proposal.endTime || proposal.active) {
            proposal.active = false;
            emit ProposalStatusChanged(proposalId, false);
        }
    }

    // function pause() public  {
    //     _pause();
    // }

    // function unpause() public  {
    //     _unpause();
    // }
}
