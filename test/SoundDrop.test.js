const { expect } = require("chai");
const { ethers } = require("hardhat");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");

describe("SoundDrop Smart Contract", function () {
  let soundDrop;
  let owner, alice, bob, charlie;

  beforeEach(async function () {
    [owner, alice, bob, charlie] = await ethers.getSigners();
    const SoundDrop = await ethers.getContractFactory("SoundDrop");
    soundDrop = await SoundDrop.deploy();
    await soundDrop.waitForDeployment();
  });

  describe("Song Submission", function () {
    it("should allow a user to submit a song and emit SongSubmitted event", async function () {
      const tx = await soundDrop.connect(alice).submitSong(
        "Blinding Lights",
        "The Weeknd",
        "Spotify",
        "https://open.spotify.com/track/0VjIjW4GlUZAMYd2vXMi3b",
        "Synthwave masterpiece from After Hours"
      );

      await expect(tx)
        .to.emit(soundDrop, "SongSubmitted")
        .withArgs(
          1,
          alice.address,
          "Blinding Lights",
          "The Weeknd",
          "Spotify",
          "https://open.spotify.com/track/0VjIjW4GlUZAMYd2vXMi3b",
          "Synthwave masterpiece from After Hours",
          anyValue
        );

      expect(await soundDrop.totalSubmissions()).to.equal(1);
      expect(await soundDrop.activeSubmissions()).to.equal(1);
      expect(await soundDrop.totalLikes()).to.equal(0);

      const song = await soundDrop.songs(1);
      expect(song.title).to.equal("Blinding Lights");
      expect(song.artist).to.equal("The Weeknd");
      expect(song.platform).to.equal("Spotify");
      expect(song.url).to.equal("https://open.spotify.com/track/0VjIjW4GlUZAMYd2vXMi3b");
      expect(song.description).to.equal("Synthwave masterpiece from After Hours");
      expect(song.author).to.equal(alice.address);
      expect(song.likeCount).to.equal(0);
      expect(song.isActive).to.be.true;
    });

    it("should allow submission with empty optional description", async function () {
      await soundDrop.connect(bob).submitSong(
        "Starboy",
        "The Weeknd ft. Daft Punk",
        "YouTube",
        "https://www.youtube.com/watch?v=34Na4j8AVgA",
        ""
      );
      const song = await soundDrop.songs(1);
      expect(song.description).to.equal("");
      expect(song.title).to.equal("Starboy");
    });

    it("should revert if required fields are empty", async function () {
      await expect(
        soundDrop.submitSong("", "Artist", "Spotify", "https://url.com", "desc")
      ).to.be.revertedWithCustomError(soundDrop, "EmptyTitle");

      await expect(
        soundDrop.submitSong("Title", "", "Spotify", "https://url.com", "desc")
      ).to.be.revertedWithCustomError(soundDrop, "EmptyArtist");

      await expect(
        soundDrop.submitSong("Title", "Artist", "", "https://url.com", "desc")
      ).to.be.revertedWithCustomError(soundDrop, "EmptyPlatform");

      await expect(
        soundDrop.submitSong("Title", "Artist", "Spotify", "", "desc")
      ).to.be.revertedWithCustomError(soundDrop, "EmptyUrl");
    });
  });

  describe("Liking and Unliking", function () {
    beforeEach(async function () {
      await soundDrop.connect(alice).submitSong(
        "Midnight City",
        "M83",
        "Spotify",
        "https://open.spotify.com/track/1eyzqe2QqGZUmfcPZtrIyt",
        "Iconic saxophone outro"
      );
    });

    it("should allow a user to like a song and update counters", async function () {
      await expect(soundDrop.connect(bob).likeSong(1))
        .to.emit(soundDrop, "SongLiked")
        .withArgs(1, bob.address, 1);

      const song = await soundDrop.songs(1);
      expect(song.likeCount).to.equal(1);
      expect(await soundDrop.totalLikes()).to.equal(1);
      expect(await soundDrop.hasUserLiked(1, bob.address)).to.be.true;
    });

    it("should prevent duplicate likes from the same wallet", async function () {
      await soundDrop.connect(bob).likeSong(1);

      await expect(
        soundDrop.connect(bob).likeSong(1)
      ).to.be.revertedWithCustomError(soundDrop, "AlreadyLiked");
    });

    it("should allow multiple different users to like a song", async function () {
      await soundDrop.connect(bob).likeSong(1);
      await soundDrop.connect(charlie).likeSong(1);
      await soundDrop.connect(owner).likeSong(1);

      const song = await soundDrop.songs(1);
      expect(song.likeCount).to.equal(3);
      expect(await soundDrop.totalLikes()).to.equal(3);
    });

    it("should allow a user to unlike a song and update counters", async function () {
      await soundDrop.connect(bob).likeSong(1);
      expect((await soundDrop.songs(1)).likeCount).to.equal(1);

      await expect(soundDrop.connect(bob).unlikeSong(1))
        .to.emit(soundDrop, "SongUnliked")
        .withArgs(1, bob.address, 0);

      const song = await soundDrop.songs(1);
      expect(song.likeCount).to.equal(0);
      expect(await soundDrop.totalLikes()).to.equal(0);
      expect(await soundDrop.hasUserLiked(1, bob.address)).to.be.false;
    });

    it("should revert when trying to unlike a song not previously liked", async function () {
      await expect(
        soundDrop.connect(bob).unlikeSong(1)
      ).to.be.revertedWithCustomError(soundDrop, "NotLiked");
    });

    it("should revert like/unlike on non-existent songs", async function () {
      await expect(
        soundDrop.connect(bob).likeSong(999)
      ).to.be.revertedWithCustomError(soundDrop, "SongDoesNotExist");

      await expect(
        soundDrop.connect(bob).unlikeSong(999)
      ).to.be.revertedWithCustomError(soundDrop, "SongDoesNotExist");
    });
  });

  describe("Song Removal", function () {
    beforeEach(async function () {
      await soundDrop.connect(alice).submitSong(
        "N95",
        "Kendrick Lamar",
        "Spotify",
        "https://open.spotify.com/track/0fX4oN66nnthPmZeBHGDi8",
        "Mr. Morale"
      );
      await soundDrop.connect(bob).likeSong(1);
    });

    it("should allow only the author to remove their submission", async function () {
      await expect(
        soundDrop.connect(bob).removeSong(1)
      ).to.be.revertedWithCustomError(soundDrop, "NotSongAuthor");

      await expect(soundDrop.connect(alice).removeSong(1))
        .to.emit(soundDrop, "SongRemoved")
        .withArgs(1, alice.address, anyValue);

      const song = await soundDrop.songs(1);
      expect(song.isActive).to.be.false;
      expect(await soundDrop.activeSubmissions()).to.equal(0);
      expect(await soundDrop.totalSubmissions()).to.equal(1);
      // Total likes should subtract the removed song's likes
      expect(await soundDrop.totalLikes()).to.equal(0);
    });

    it("should revert if removing an already removed song", async function () {
      await soundDrop.connect(alice).removeSong(1);

      await expect(
        soundDrop.connect(alice).removeSong(1)
      ).to.be.revertedWithCustomError(soundDrop, "SongNotActive");
    });

    it("should revert likes on removed songs", async function () {
      await soundDrop.connect(alice).removeSong(1);

      await expect(
        soundDrop.connect(charlie).likeSong(1)
      ).to.be.revertedWithCustomError(soundDrop, "SongNotActive");
    });
  });

  describe("Retrieval and Batch View Functions", function () {
    beforeEach(async function () {
      await soundDrop.connect(alice).submitSong("Song 1", "Artist 1", "Spotify", "https://s1.com", "Desc 1");
      await soundDrop.connect(bob).submitSong("Song 2", "Artist 2", "YouTube", "https://s2.com", "Desc 2");
      await soundDrop.connect(charlie).submitSong("Song 3", "Artist 3", "SoundCloud", "https://s3.com", "Desc 3");

      await soundDrop.connect(alice).likeSong(2);
      await soundDrop.connect(alice).likeSong(3);
    });

    it("should return all songs including inactive ones", async function () {
      await soundDrop.connect(bob).removeSong(2);

      const allSongs = await soundDrop.getAllSongs();
      expect(allSongs.length).to.equal(3);
      expect(allSongs[0].title).to.equal("Song 1");
      expect(allSongs[1].title).to.equal("Song 2");
      expect(allSongs[1].isActive).to.be.false;
      expect(allSongs[2].title).to.equal("Song 3");
    });

    it("should return only active songs with getActiveSongs()", async function () {
      await soundDrop.connect(bob).removeSong(2);

      const activeSongs = await soundDrop.getActiveSongs();
      expect(activeSongs.length).to.equal(2);
      expect(activeSongs[0].id).to.equal(1);
      expect(activeSongs[1].id).to.equal(3);
    });

    it("should batch check likes for a user", async function () {
      const results = await soundDrop.batchHasLiked([1, 2, 3], alice.address);
      expect(results[0]).to.be.false;
      expect(results[1]).to.be.true;
      expect(results[2]).to.be.true;
    });

    it("should return accurate platform stats", async function () {
      const [total, active, likes] = await soundDrop.getStats();
      expect(total).to.equal(3);
      expect(active).to.equal(3);
      expect(likes).to.equal(2);
    });
  });
});

