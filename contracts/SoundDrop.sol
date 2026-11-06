// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title SoundDrop
 * @notice Decentralized music-discovery platform where users share songs they love and explore music recommendations.
 * Tagline: "Discover. Share. Repeat."
 */
contract SoundDrop {
    struct Song {
        uint256 id;
        string title;
        string artist;
        string platform;     // e.g. "Spotify", "YouTube", "Apple Music", "SoundCloud"
        string url;          // Direct song URL
        string description;  // Optional short note / recommendation
        address author;      // Submitter address
        uint256 timestamp;   // Submission block timestamp
        uint256 likeCount;   // Likes counter
        bool isActive;       // Whether the song is active or removed by author
    }

    // Counters
    uint256 public totalSubmissions;
    uint256 public activeSubmissions;
    uint256 public totalLikes;

    // Song storage: songId => Song (1-based index)
    mapping(uint256 => Song) public songs;

    // Like tracking: songId => (userAddress => hasLiked)
    mapping(uint256 => mapping(address => bool)) public hasLiked;

    // Events
    event SongSubmitted(
        uint256 indexed songId,
        address indexed author,
        string title,
        string artist,
        string platform,
        string url,
        string description,
        uint256 timestamp
    );

    event SongLiked(
        uint256 indexed songId,
        address indexed user,
        uint256 newLikeCount
    );

    event SongUnliked(
        uint256 indexed songId,
        address indexed user,
        uint256 newLikeCount
    );

    event SongRemoved(
        uint256 indexed songId,
        address indexed author,
        uint256 timestamp
    );

    // Custom errors for clarity and gas efficiency
    error EmptyTitle();
    error EmptyArtist();
    error EmptyPlatform();
    error EmptyUrl();
    error SongDoesNotExist();
    error SongNotActive();
    error NotSongAuthor();
    error AlreadyLiked();
    error NotLiked();

    constructor() {}

    /**
     * @notice Submits a song to SoundDrop.
     * @param _title Song title
     * @param _artist Artist name
     * @param _platform Music platform ("Spotify", "YouTube", etc.)
     * @param _url Direct URL to the song
     * @param _description Optional description / listener note
     * @return songId The ID assigned to the new song
     */
    function submitSong(
        string calldata _title,
        string calldata _artist,
        string calldata _platform,
        string calldata _url,
        string calldata _description
    ) external returns (uint256) {
        if (bytes(_title).length == 0) revert EmptyTitle();
        if (bytes(_artist).length == 0) revert EmptyArtist();
        if (bytes(_platform).length == 0) revert EmptyPlatform();
        if (bytes(_url).length == 0) revert EmptyUrl();

        unchecked {
            totalSubmissions++;
            activeSubmissions++;
        }

        uint256 newSongId = totalSubmissions;

        songs[newSongId] = Song({
            id: newSongId,
            title: _title,
            artist: _artist,
            platform: _platform,
            url: _url,
            description: _description,
            author: msg.sender,
            timestamp: block.timestamp,
            likeCount: 0,
            isActive: true
        });

        emit SongSubmitted(
            newSongId,
            msg.sender,
            _title,
            _artist,
            _platform,
            _url,
            _description,
            block.timestamp
        );

        return newSongId;
    }

    /**
     * @notice Likes a song. Reverts if already liked by sender.
     * @param _songId The ID of the song
     */
    function likeSong(uint256 _songId) external {
        if (_songId == 0 || _songId > totalSubmissions) revert SongDoesNotExist();
        Song storage song = songs[_songId];
        if (!song.isActive) revert SongNotActive();
        if (hasLiked[_songId][msg.sender]) revert AlreadyLiked();

        hasLiked[_songId][msg.sender] = true;
        unchecked {
            song.likeCount++;
            totalLikes++;
        }

        emit SongLiked(_songId, msg.sender, song.likeCount);
    }

    /**
     * @notice Unlikes a previously liked song.
     * @param _songId The ID of the song
     */
    function unlikeSong(uint256 _songId) external {
        if (_songId == 0 || _songId > totalSubmissions) revert SongDoesNotExist();
        Song storage song = songs[_songId];
        if (!song.isActive) revert SongNotActive();
        if (!hasLiked[_songId][msg.sender]) revert NotLiked();

        hasLiked[_songId][msg.sender] = false;
        unchecked {
            if (song.likeCount > 0) {
                song.likeCount--;
            }
            if (totalLikes > 0) {
                totalLikes--;
            }
        }

        emit SongUnliked(_songId, msg.sender, song.likeCount);
    }

    /**
     * @notice Removes a song. Only the author can perform this action.
     * @param _songId The ID of the song to remove
     */
    function removeSong(uint256 _songId) external {
        if (_songId == 0 || _songId > totalSubmissions) revert SongDoesNotExist();
        Song storage song = songs[_songId];
        if (!song.isActive) revert SongNotActive();
        if (song.author != msg.sender) revert NotSongAuthor();

        song.isActive = false;
        unchecked {
            if (activeSubmissions > 0) {
                activeSubmissions--;
            }
            if (totalLikes >= song.likeCount) {
                totalLikes -= song.likeCount;
            } else {
                totalLikes = 0;
            }
        }

        emit SongRemoved(_songId, msg.sender, block.timestamp);
    }

    /**
     * @notice Retrieves all submitted songs.
     * @return An array of all Song structs
     */
    function getAllSongs() external view returns (Song[] memory) {
        Song[] memory allSongs = new Song[](totalSubmissions);
        for (uint256 i = 1; i <= totalSubmissions; i++) {
            allSongs[i - 1] = songs[i];
        }
        return allSongs;
    }

    /**
     * @notice Retrieves only active (non-removed) songs.
     * @return An array of active Song structs
     */
    function getActiveSongs() external view returns (Song[] memory) {
        Song[] memory activeList = new Song[](activeSubmissions);
        uint256 index = 0;
        for (uint256 i = 1; i <= totalSubmissions; i++) {
            if (songs[i].isActive) {
                activeList[index] = songs[i];
                index++;
                if (index == activeSubmissions) break;
            }
        }
        return activeList;
    }

    /**
     * @notice Checks if a user has liked a specific song.
     * @param _songId Song ID
     * @param _user User address
     */
    function hasUserLiked(uint256 _songId, address _user) external view returns (bool) {
        return hasLiked[_songId][_user];
    }

    /**
     * @notice Batch checks like status for multiple songs for a user.
     * @param _songIds Array of Song IDs
     * @param _user User address
     */
    function batchHasLiked(uint256[] calldata _songIds, address _user) external view returns (bool[] memory) {
        bool[] memory results = new bool[](_songIds.length);
        for (uint256 i = 0; i < _songIds.length; i++) {
            results[i] = hasLiked[_songIds[i]][_user];
        }
        return results;
    }

    /**
     * @notice Gets platform stats: total submissions, active songs, and total likes.
     */
    function getStats() external view returns (uint256 _totalSubmissions, uint256 _activeSubmissions, uint256 _totalLikes) {
        return (totalSubmissions, activeSubmissions, totalLikes);
    }
}

