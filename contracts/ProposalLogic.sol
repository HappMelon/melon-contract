// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
import "./IProposalLogic.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./Counters.sol";

contract ProposalLogic is IProposalLogic, ReentrancyGuard, Pausable, Ownable {
    // 状态变量
    uint256 constant MAX_UINT256 = type(uint256).max;
    address public myToken; // 用于投票的代币地址
    using Counters for Counters.Counter;
    Counters.Counter private _UserStakeIdCounter; // 用于跟踪每次质押的计数器
    Proposal[] public proposals; // 提案数组

    mapping(address => uint256) public balances;
    mapping(address => VoteRecord[]) public userVotingHistory; // 用户的投票历史记录映射
    mapping(uint256 => Option[]) public proposalOptions; // 提案ID到选项数组的映射
    mapping(address => mapping(uint256 => bool)) public voters;
    mapping(address => uint256) public proposalTokenDeposits; // 用户发起提案时的金额
    mapping(address => uint256) public usedVotingRights; // 用户投票的金额
    mapping(uint256 => address[]) public voterAddressesByProposal;
    mapping(uint256 => uint256[]) public optionIdsByProposal;
    mapping(uint256 => uint256[]) public voteCountsByProposal;
    mapping(address => mapping(uint256 => uint256)) public voterIndexInProposal;
    mapping(uint256 => uint) public winningOptionByProposal; // 记录已结算提案的获胜选项
    mapping(uint => mapping(address => int)) public rewardOrPenaltyInSettledProposal; // 记录结算提案用户的奖励或者惩罚

    // 修饰符

    // 函数
    constructor(address _myToken) Ownable(msg.sender) {
        myToken = _myToken;
    }

    function getOptionsCount(uint256 proposalId) public view returns (uint256) {
        return proposalOptions[proposalId].length;
    }

    // 获取用户投票的金额
    function getUserVotingRights(
        address userAddress
    ) public view returns (uint256) {
        return usedVotingRights[userAddress];
    }

    // 常规质押代币
    function deposit(uint256 amount) public {
        require(
            IERC20(myToken).transferFrom(msg.sender, address(this), amount),
            "Transfer failed"
        );
        balances[msg.sender] = balances[msg.sender] + amount;
        emit Deposited(msg.sender, amount);
    }

    function createProposal(
        address user,
        string memory description,
        uint256 amount,
        string[] memory options,
        uint256 endtime
    ) public onlyOwner{
        uint256 unlockTime = block.timestamp + (endtime * 1 days);
        uint256 newId = proposals.length; // 获取新的提案ID
        proposals.push(
            Proposal({
                proposer: user,
                description: description,
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
            description,
            amount,
            options,
            unlockTime
        );
    }

    function exchangePoints(uint256 points) public {
        require(points > 0, "Points must be greater than zero");
        // 执行兑换逻辑
        balances[msg.sender] += points;
        emit ExchangePoints(msg.sender, points);
    }

    function withdraw(uint256 _amount) public nonReentrant {
        // 确保用户有足够的余额来提取
        uint256 availableBalance = getAvailableWithdrawBalance(msg.sender);
        require(
            availableBalance >= _amount,
            "Not enough available balance to withdraw"
        );

        // 在余额更新前执行转账
        require(
            IERC20(myToken).transfer(msg.sender, _amount),
            "Transfer failed"
        );

        // 更新余额
        balances[msg.sender] = balances[msg.sender] - _amount;

        // 触发提款事件
        emit WithdrawalDetailed(msg.sender, _amount, balances[msg.sender]);
    }

    function getAvailableWithdrawBalance(
        address user
    ) public view returns (uint256) {
        uint256 totalBalance = balances[user];
        uint256 lockedForVoting = usedVotingRights[user];
        uint256 lockedInProposals = proposalTokenDeposits[user];

        // 计算因提案和投票锁定的代币总量
        uint256 totalLocked = lockedForVoting + lockedInProposals;
        return totalBalance > totalLocked ? totalBalance - totalLocked : 0;
    }

    function getProposalStatus(uint256 _proposalId) public view returns (bool) {
        Proposal storage proposal = proposals[_proposalId];
        return proposal.active;
    }

    // 投票
    function vote(
        uint256 _proposalId,
        uint256 _optionId,
        uint256 _amount
    ) public whenNotPaused {
        require(_proposalId < proposals.length, "The proposal does not exist");
        require(
            _optionId < proposalOptions[_proposalId].length,
            "The option does not exist"
        );
        require(
            block.timestamp < proposals[_proposalId].endTime,
            "The voting period for this proposal has ended"
        );
        require(proposals[_proposalId].active, "The proposal is not active");
        // 余额减去投票锁定的代币数量和自己发起的提案锁定的代币数量
        uint256 remainingVotingRights = balances[msg.sender] -
            usedVotingRights[msg.sender] -
            proposalTokenDeposits[msg.sender];
        require(remainingVotingRights >= _amount, "Insufficient voting rights");
        //  更新用户投票金额
        usedVotingRights[msg.sender] = usedVotingRights[msg.sender] + _amount;
        // 更新被选中提案选项的票数
        // 更新用户对应的提案的投票金额
        proposalOptions[_proposalId][_optionId].voteCount += _amount;
        // votingRecords[msg.sender][_proposalId] += _amount;
        // 记录已经投票过
        voters[msg.sender][_proposalId] = true;
        // 记录用户投票历史
        userVotingHistory[msg.sender].push(
            VoteRecord(_proposalId, _optionId, _amount)
        );
        // 记录当前投票者
        // proposalVoters[_proposalId].push(msg.sender);

        // 记录投票者地址、选项ID和投票数
        voterAddressesByProposal[_proposalId].push(msg.sender);
        optionIdsByProposal[_proposalId].push(_optionId);
        voteCountsByProposal[_proposalId].push(_amount);

        // 记录投票者在提案中的索引
        voterIndexInProposal[msg.sender][_proposalId] =
            voterAddressesByProposal[_proposalId].length -
            1;

        emit Voted(msg.sender, _proposalId, _optionId, _amount);
    }

    // Get the balance of the contract itself in MyToken
    function getContractBalance() public view returns (uint) {
        return IERC20(myToken).balanceOf(address(this));
    }

    function pause() public onlyOwner {
        _pause();
    }

    function unpause() public onlyOwner {
        _unpause();
    }

    function getUserVotingHistory(
        address _user
    )
        public
        view
        returns (
            uint256[] memory proposalIds,
            uint256[] memory optionIds,
            uint256[] memory amounts
        )
    {
        VoteRecord[] storage records = userVotingHistory[_user];
        proposalIds = new uint256[](records.length);
        optionIds = new uint256[](records.length);
        amounts = new uint256[](records.length);

        for (uint256 i = 0; i < records.length; i++) {
            proposalIds[i] = records[i].proposalId;
            optionIds[i] = records[i].optionId;
            amounts[i] = records[i].amount;
        }
    }

    function getOptionVoteCount(
        uint256 proposalId,
        uint256 optionIndex
    ) public view returns (uint256) {
        require(proposalId < proposals.length, "Proposal does not exist.");
        require(
            optionIndex < proposalOptions[proposalId].length,
            "Option does not exist."
        );
        return proposalOptions[proposalId][optionIndex].voteCount;
    }

    // 检查是否是只有一个选项被投递的情况
    function isSingleOptionProposal(
        uint256 proposalId,
        uint winningOptionId
    ) public view returns (bool) {
        Proposal storage proposal = proposals[proposalId];
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
    ) public onlyOwner nonReentrant {
        Proposal storage proposal = proposals[proposalId];
        require(
            !proposal.active,
            "Proposal must be inactive to settle rewards."
        );
        require(!proposal.isSettled, "Rewards already settled");

        // 检查只有一个选项被选择的情况
        bool isSingleOptionStatus = isSingleOptionProposal(
            proposalId,
            winningOptionId
        );

        if (isSingleOptionStatus) {
            // 原路退回所有的质押
            for (
                uint256 i = 0;
                i < voterAddressesByProposal[winningOptionId].length;
                i++
            ) {
                // 获取投票者地址、选项ID和投票数
                address voter = voterAddressesByProposal[proposalId][i];
                uint256 voteCount = voteCountsByProposal[proposalId][i];
                usedVotingRights[voter] -= voteCount;
            }
            emit ProposalRefunded(proposalId, winningOptionId);
        } else {
            uint totalStake;
            uint optionCount = proposalOptions[proposalId].length;
            // 计算该提案所有选项质押的总金额
            for (uint i = 0; i < optionCount; i++) {
                totalStake += getOptionVoteCount(proposalId, i);
            }
            // 提案发起者获得提案质押的5%奖励
            balances[proposal.proposer] += (totalStake * 5) / 100;

            // 计算抽取5%平台手续费和5%提案发起人奖励后的提案代币数量
            uint totalStakeExtractFee = (totalStake * 90) / 100;

            //计算每个投票用户的奖励或惩罚
            for (
                uint256 i = 0;
                i < voterAddressesByProposal[proposalId].length;
                i++
            ) {
                // 获取投票者地址、选项ID和投票数
                address voter = voterAddressesByProposal[proposalId][i];
                uint256 optionId = optionIdsByProposal[proposalId][i];
                uint256 voteCount = voteCountsByProposal[proposalId][i];
                // 当前选项获得的质押
                uint optionVoteCount = proposalOptions[proposalId][optionId]
                    .voteCount;

                usedVotingRights[voter] -= voteCount;

                if (optionId == winningOptionId) {
                    // 按照投票人质押的比例分配奖励
                    uint voterReward = (voteCount * totalStakeExtractFee) /
                        optionVoteCount;
                    // 计算获利部分金额
                    voterReward -= voteCount;
                    balances[voter] += voterReward; // 更新赢家余额
                    // 记录获得的奖励
                    rewardOrPenaltyInSettledProposal[proposalId][
                        voter
                    ] = int256(voterReward);
                    emit RewardDistributed(
                        voter,
                        proposalId,
                        voterReward,
                        true
                    );
                } else {
                    uint256 voterPunish = voteCount;
                    // 计算惩罚金额                   
                    balances[voter] -= voterPunish;
                    // 记录获得的惩罚
                    rewardOrPenaltyInSettledProposal[proposalId][voter] =
                        int256(voterPunish) *
                        -1;
                    emit RewardDistributed(
                        voter,
                        proposalId,
                        voterPunish,
                        false
                    );
                }
            }
        }
        // 记录提案获胜的选项
        winningOptionByProposal[proposalId] = winningOptionId;
        // 更新提案状态
        proposal.isSettled = true;
    }

    // 评价一般提案
    function settleFundsForAverageQuality(
        uint256 _proposalId
    ) public onlyOwner {
        require(_proposalId < proposals.length, "Proposal does not exist.");
        Proposal storage proposal = proposals[_proposalId];
        require(proposal.active, "Proposal is still active.");
        require(!proposal.isSettled, "Funds already settled");
        deactivateProposal(_proposalId); // 将提案状态设置为非活跃

        uint256 stakedAmount = proposal.stakeAmount;
        if (proposal.isWagered) {
            uint256 currentDeposit = proposalTokenDeposits[proposal.proposer];
            proposalTokenDeposits[proposal.proposer] = stakedAmount >
                currentDeposit
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
            _proposalId,
            proposal.proposer,
            profit
        );
    }

    function verifyComplianceAndExpectations(
        uint256 _proposalId
    ) public onlyOwner {
        require(_proposalId < proposals.length, "Proposal does not exist.");
        Proposal storage proposal = proposals[_proposalId];
        require(proposal.active, "Proposal is still active.");
        require(!proposal.isSettled, "Funds already settled");
        deactivateProposal(_proposalId); // 将提案状态设置为非活跃
        uint256 stakedAmount = proposal.stakeAmount;
        if (proposal.isWagered) {
            // 确保不会导致下溢
            uint256 currentDeposit = proposalTokenDeposits[proposal.proposer];
            proposalTokenDeposits[proposal.proposer] = stakedAmount >
                currentDeposit
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
            _proposalId,
            proposal.proposer,
            profit
        );
    }

    function checkQualityComplianceBelowExpectations(
        uint256 _proposalId
    ) public onlyOwner {
        require(_proposalId < proposals.length, "Proposal does not exist.");
        Proposal storage proposal = proposals[_proposalId];
        require(proposal.active, "Proposal is still active.");
        require(!proposal.isSettled, "Funds already settled");
        deactivateProposal(_proposalId); // 将提案状态设置为非活跃

        uint256 stakedAmount = proposal.stakeAmount;
        if (proposal.isWagered) {
            // 确保不会导致下溢
            uint256 currentDeposit = proposalTokenDeposits[proposal.proposer];
            proposalTokenDeposits[proposal.proposer] = stakedAmount >
                currentDeposit
                ? 0
                : currentDeposit - stakedAmount;
        } else {
            proposal.isSettled = true;
        }
        uint256 punishment = (proposal.stakeAmount * 5) / 100; // Calculating 5% punishment

        balances[proposal.proposer] -= punishment; // Updating balance without actual transfer

        emit FundsPenalizedForNonCompliance(
            _proposalId,
            proposal.proposer,
            punishment
        );
    }

    function deactivateProposal(uint256 _proposalId) public {
        Proposal storage proposal = proposals[_proposalId];
        if (block.timestamp > proposal.endTime || proposal.active) {
            proposal.active = false;
            emit ProposalStatusChanged(_proposalId, false);
        }
    }
}
