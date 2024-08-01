// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./JuryNFTSwap.sol";
import "./MelonToken.sol";
import "./Pledge.sol";

contract Proposal is Initializable, UUPSUpgradeable {
    struct Option {
        string desc;
        uint256 count;
        uint256 voters;
    }

    struct ProposalInfo {
        address founder;
        Option[] options;
    }

    struct VoteInfo {
        address user;
        uint256 amount;
    }

    event Deposited(address indexed user, uint256 amount);

    event Voted(
        address indexed _address,
        uint256 indexed _proposalId,
        uint256 indexed _optionId,
        uint256 _amount
    );

    event Withdraw(address indexed user, uint256 amount, uint256 balance);

    event Create(address indexed founder, uint256 indexed id, string[] options);

    event Settle(uint256 proposalId, uint256 winningOptionId, address[] jurors);

    event ExchangePoints(address indexed user, uint256 points);

    event Refunded(uint256 indexed proposalId, uint256 amount);

    event JurorsDistributeRewards(
        uint256 indexed proposalId,
        address[] jurors,
        uint256 reward,
        uint256 rewardPerJuror
    );

    error InsufficientBalance(address user, uint256 availableBalance);

    error OwnableUnauthorizedAccount(address account);

    // state variable
    address public owner;

    address public logicAddress;

    MelonToken public mlnToken; // Token Address

    JuryNFTSwap public juryNFTSwap;

    Pledge public pledge;

    ProposalInfo[] public proposalInfos; // Proposal array

    mapping(address => uint256) public balances;

    mapping(address => uint256) public votingLock; // The amount voted by the user

    mapping(uint256 => mapping(uint256 => VoteInfo[])) public voting;

    mapping(uint256 => uint256) public winningOption; // Record the winning options for settled proposals

    mapping(uint256 => mapping(address => int256)) public userProposalResults; // Record rewards or punishments for settlement proposal users

    // Modifier
    modifier onlyOwner() {
        if (owner != msg.sender) {
            revert OwnableUnauthorizedAccount(msg.sender);
        }
        _;
    }

    // function
    function initialize(
        address _tokenAddr,
        address _juryNFTSwapAddr,
        address _pledgeAddr
    ) external initializer {
        mlnToken = MelonToken(_tokenAddr);
        juryNFTSwap = JuryNFTSwap(_juryNFTSwapAddr);
        pledge = Pledge(_pledgeAddr);

        owner = msg.sender;
    }

    function setNewToken(address _tokenAddr) external onlyOwner {
        mlnToken = MelonToken(_tokenAddr);
    }

    function setNewJuryNFTSwap(address _juryNFTSwapAddr) external onlyOwner {
        juryNFTSwap = JuryNFTSwap(_juryNFTSwapAddr);
    }

    function setNewPledge(address _pledgeAddr) external onlyOwner {
        pledge = Pledge(_pledgeAddr);
    }

    function addInterest(address user, uint interestAmount) external {
        balances[user] += interestAmount;
    }

    function getVoting(
        uint256 proposalId,
        uint256 optionId
    ) external view returns (VoteInfo[] memory) {
        return voting[proposalId][optionId];
    }

    function deposit(uint256 amount) external returns (uint256) {
        require(
            mlnToken.transferFrom(msg.sender, address(this), amount),
            "Transfer failed"
        );
        balances[msg.sender] += amount;
        emit Deposited(msg.sender, amount);
        return balances[msg.sender];
    }

    function getDetails(
        uint256 proposalId
    )
        public
        view
        returns (
            address founder,
            string[] memory optionDescription,
            uint256[] memory counts,
            uint256[] memory voters,
            uint256 allVotesCast,
            uint256 allVoters
        )
    {
        ProposalInfo storage proposal = proposalInfos[proposalId];
        uint256 optionLength = proposal.options.length;

        optionDescription = new string[](optionLength);
        counts = new uint256[](optionLength);
        voters = new uint256[](optionLength);
        founder = proposal.founder;

        for (uint256 i = 0; i < optionLength; i++) {
            optionDescription[i] = proposal.options[i].desc;
            counts[i] = proposal.options[i].count;
            voters[i] = proposal.options[i].voters;
            allVoters += proposal.options[i].voters;
            allVotesCast += proposal.options[i].count;
        }
    }

    function create(string[] memory optionDescs) external {
        require(optionDescs.length > 0, "len error");
        // 创建新的 ProposalInfo 实例
        ProposalInfo storage newProposal = proposalInfos.push();

        newProposal.founder = msg.sender;

        for (uint256 i = 0; i < optionDescs.length; i++) {
            newProposal.options.push(Option(optionDescs[i], 0, 0));
        }

        // 返回新 ProposalInfo 实例的索引
        uint256 len = proposalInfos.length - 1;

        emit Create(msg.sender, len, optionDescs);
    }

    function exchangePoints(uint256 points) external {
        require(points > 0, "Points must be greater than zero");
        balances[msg.sender] += points;
        emit ExchangePoints(msg.sender, points);
    }

    function withdraw(uint256 amount) external {
        uint256 availableBalance = getAvailableBalance(msg.sender);

        if (availableBalance < amount) {
            revert InsufficientBalance(msg.sender, availableBalance);
        }

        require(mlnToken.transfer(msg.sender, amount), "Transfer failed");

        balances[msg.sender] -= amount;
        emit Withdraw(msg.sender, amount, balances[msg.sender]);
    }

    function vote(
        uint256 proposalId,
        uint256 optionId,
        uint256 amount
    ) external {
        require(
            getAvailableBalance(msg.sender) >= amount,
            "Insufficient voting rights"
        );
        votingLock[msg.sender] += amount;

        ProposalInfo storage proposal = proposalInfos[proposalId];
        proposal.options[optionId].count += amount;
        proposal.options[optionId].voters += 1;

        voting[proposalId][optionId].push(VoteInfo(msg.sender, amount));

        emit Voted(msg.sender, proposalId, optionId, amount);
    }

    function settle(
        uint256 proposalId,
        uint256 winOptionId,
        address[] memory jurors
    ) external {
        emit Settle(proposalId, winOptionId, jurors);

        bool isSingleOptionStatus = isSingleOptionProposal(proposalId);

        if (isSingleOptionStatus) {
            handleSingleOptionProposal(proposalId);
        } else {
            handleJurorsDistributeRewards(proposalId, jurors);
            handleMultiOptionProposal(proposalId, winOptionId);
        }
        winningOption[proposalId] = winOptionId;
    }

    function getAvailableBalance(address user) public view returns (uint256) {
        uint totalLock = 0;

        uint pledgeLock = pledge.pledgeLock(user);
        uint nftLock = juryNFTSwap.nftLock(user);
        uint256 voteLock = votingLock[user];

        totalLock += nftLock;
        totalLock += voteLock;
        totalLock += pledgeLock;

        uint256 totalBalance = balances[user];
        return totalBalance - totalLock;
    }

    function isSingleOptionProposal(
        uint256 proposalId
    ) internal view returns (bool) {
        ProposalInfo memory proposalInfo = proposalInfos[proposalId];
        Option[] memory options = proposalInfo.options;
        for (uint256 i = 0; i < options.length; i++) {
            if (options[i].count > 0) {
                for (uint256 j = 0; j < options.length; j++) {
                    if (i != j && options[j].count > 0) {
                        return false;
                    }
                }
            }
        }
        return true;
    }

    function handleJurorsDistributeRewards(
        uint256 proposalId,
        address[] memory jurors
    ) internal {
        (, , , , uint256 allVotesCast, ) = getDetails(proposalId);

        uint256 reward = (allVotesCast * 2) / 100;
        uint256 rewardPerJuror = reward / jurors.length;

        for (uint256 i = 0; i < jurors.length; i++) {
            balances[jurors[i]] += rewardPerJuror;
            userProposalResults[proposalId][jurors[i]] = int256(rewardPerJuror);
        }

        emit JurorsDistributeRewards(
            proposalId,
            jurors,
            reward,
            rewardPerJuror
        );
    }

    function handleSingleOptionProposal(uint256 proposalId) internal {
        ProposalInfo storage proposalInfo = proposalInfos[proposalId];
        uint256 optionCount = proposalInfo.options.length;
        uint256 totalRefund = 0;

        for (uint256 i = 0; i < optionCount; i++) {
            VoteInfo[] memory voteInfos = voting[proposalId][i];
            for (uint256 j = 0; j < voteInfos.length; j++) {
                VoteInfo memory voteInfo = voteInfos[j];
                votingLock[voteInfo.user] -= voteInfo.amount;
                totalRefund += voteInfo.amount;
            }
        }
        emit Refunded(proposalId, totalRefund); // Emit total refunded amount
    }

    function handleMultiOptionProposal(
        uint256 proposalId,
        uint256 winOptionId
    ) internal {
        ProposalInfo storage proposalInfo = proposalInfos[proposalId];
        uint256 optionCount = proposalInfo.options.length;

        (, , uint256[] memory counts, , uint256 allVotesCast, ) = getDetails(
            proposalId
        );
        balances[proposalInfo.founder] += (allVotesCast * 5) / 100;
        uint256 totalStakeExtractFee = (allVotesCast * 88) / 100;

        for (uint256 i = 0; i < optionCount; i++) {
            VoteInfo[] memory voteInfos = voting[proposalId][i]; // Corrected: Use i instead of winOptionId
            for (uint256 j = 0; j < voteInfos.length; j++) {
                VoteInfo memory voteInfo = voteInfos[j];
                votingLock[voteInfo.user] -= voteInfo.amount;

                if (i == winOptionId) {
                    uint reward = (voteInfo.amount * totalStakeExtractFee) /
                        counts[winOptionId];
                    uint256 rewardExcludingPrincipal = reward - voteInfo.amount;
                    balances[voteInfo.user] += rewardExcludingPrincipal;
                    userProposalResults[proposalId][voteInfo.user] = int256(
                        rewardExcludingPrincipal
                    );
                } else {
                    balances[voteInfo.user] -= voteInfo.amount;
                    userProposalResults[proposalId][voteInfo.user] =
                        int256(voteInfo.amount) *
                        -1;
                }
            }
        }
    }

    function _authorizeUpgrade(
        address newImplementation
    ) internal override onlyOwner {
        logicAddress = newImplementation;
    }
}
