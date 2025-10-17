## Domains
1. Music resurfacing and recollection - Remember forgotten "bangers" and sort them into new playlists!

I love listening to music. I love discovering new songs and going back to old ones even! Sometimes I spontaneously make new playlists and lose track of songs over time. As my catalogue of liked songs grows, it becomes more difficult to remember those good ol' tunes. I feel like there is definitely a fun way to be able to rediscover and sift through your liked songs!

### Selected Problems
1. Forgotten Likes Resurfacer (Domain 1)  
As your likes grow and pile up (ex. 2500 for me!), great songs can get buried! For me, I try to always scroll through my liked songs to revisit the classics but it is just super time consuming especially when I am trying to read through the titles one by one. It is just time consuming to have to sift through all of your like songs to try and find an old classic. It would be nice to have a format to sift through your liked songs and even be able to add them to a playlist. I think it is possible to build a dymanic system that can help re-queue tracks from your earlier likes

    Why Included: For deep fans of music who have large catalogues, it can be a bit cumbersome to navigate through all of those songs. It is a pain I share as well and just feel that it is certainly feasible to design a certain application and has lots of potential for fun UX experiences!


## Stakeholders

1. Forgotten Likes Resurfacer
    * Listener (primary user): Heavy music fan with a large music catalog
    * Artist & Label (owners): Content holders whose catalog benefits from renewed plays
    * Platform: Spotify/Apple/music platforms whose APIs and policies shape what's possible and receive additional plays
    * Friends (secondary): Friends who receive the new mixes

    Impacts: The listener gains joy and variety by re-hearing buried favorites; success comes from higher replay of older tracks and newer playlists wth old tracks. Friends can benefit from better recommendations which can drive social sharing. The platform can see deeper engagement but might be the bottleneck with constraints (i.e. rate limits) that influence app development. Artists/labels gain incremenental streams from older songs and can use this feature as a metric to show replayablity of a song. 


## Evidence
1. Forgotten Likes Resurfacer  
    Evidence:
    * [Spotify removes it's 10,000-song library limit](https://www.theverge.com/2020/5/26/21270409/spotify-song-library-limit-removed-music-downloads-playlists-feature)/ Spotify removing the limit shows how users are running into large, unwieldly libraries.
    * [Users share their library sizes](https://www.reddit.com/r/spotify/comments/1j6g2mf/how_many_liked_songs_do_you_have_and_how_long). Demonstrating the need for Spotify to make this change and providing anecdotal evidence of users reaching this limit
    * [200 million songs on streaming services](https://www.musicbusinessworldwide.com/there-are-now-more-than-200m-tracks-on-audio-streaming-services-nearly-100m-of-them-attracted-no-more-than-10-plays-each). This demonstrates how the firehose is real and that not only are users discovering new music but the catalog for new music is massive and ever-growing.
    * [Preferences for Last.fm](https://medium.com/the-riff/why-i-still-use-last-fm-and-you-should-too-d193a5a20521). Many users had negative opinions about Spotify Wrapped these past few years. As a result, some Last.fm users spoke up about how they believe Last.fm provides better insight since they have longer listening histories and you don't always have to wait until November.
    * [Users note songs vanishing from liked songs](https://www.narendravardi.com/vanishing-tunes-ten-percent-of-my-liked-songs-disappeared-on-spotify/). Some users ranting about how a percentage of their songs vanish which could be due to license renewal. This causes issues where some users may never know and forget about songs they once loved!

    Comparables:
    * [Spotify Wrapped](https://support.spotify.com/uk/article/spotify-wrapped/). A recap of a user's listening patterns over the year. Helpful to see statistics about one's listening and can help show songs. The downside is that it is a long process (over a year) and isn't intended for resurfacing songs beyond a year.
    * [Spotify Daylist](https://newsroom.spotify.com/2023-09-12/ever-changing-playlist-daylist-music-for-all-day/). A dynamic, mood-titled playlist that refreshes multiple times a day. Curated to a user's vibe but doesn't necessarily tackle the issue of resurfacing old past liked songs. A good fun way of discovering music.
    * [Spotify Daily Mixes](https://www.vox.com/2016/9/27/13070726/spotify-daily-mix-playlist). Spotify has a feature that analyzes your latest listening patterns and curates "daily mixes" with liked songs based on your listening patterns. If I was listening to Rock n Roll for a week, I can expect to find some Rock n Roll daily mixes.
    * [Youtube Music Recap](https://blog.youtube/news-and-events/2024-music-recap-youtube/). Similar to Spotify Wrapped, this is intended for Youtube Music users. Can gain useful insight about one's listening patterns especially on content across Youtube.
    * [Apple Music Replay](https://support.apple.com/en-us/109356). Similar to Spotify Wrapped and Youtube Music Recap, instead curated for users of Apple Music. See listening statistics over the past year. Something to note is that none of these yearly recaps have a way to export this information into a viable format for potentially creating some interface for revisiting songs.


## Features
1. Forgotten Likes Resurfacer
    * Time-Capsule Shuffling
        * What it does: Applies a "score" to your library based on factors like: last play date, liked date, skip rate. It can create auto-mixes based on these scores and provide a one-tap feature to save any old track to a fresh playlist.
        * Why it helps: The listener gets a low-effort rediscovery method that can be integrated seamlessly into their music listening habits already. Friends benefit because revived tracks can feed into better shared playlists. 
    * Song Memory Cards Swiper
        * What it does: Presents songs as swipeable cards with quick actions such as: Keep in rotation, Skip for 90 days, Add to playlist. Rather than trying to seamlessly add old songs into the users music, the user can decide to swipe through songs and sort them into playlists in a manner similar to Tinder or Tiktok. 
        * Why it helps: Reduces decision fatigue and provides a fun alternative of sorting through songs for the listener. Platforms benefit from deeper engagement and artists gain plays.
    * Music Catalog Gatherer
        * What it does: Gathers songs from the users connected music platforms and displays in a centralized interface. Helps gather information across different platforms to capture listeners full library.
        * Why it helps: Helps the listener gather songs faster rather than having to meticulously go through each platform's liked songs. Can help produce shareable mixes for friends without cross-platform complexity. 