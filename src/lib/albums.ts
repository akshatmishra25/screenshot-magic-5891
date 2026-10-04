/**
 * Music catalog source. The app only talks to `musicSource` — swap the mock
 * implementation for a Spotify-backed one (e.g. server functions calling the
 * Spotify Web API) without touching any UI code.
 */
export type Album = {
  id: string;
  title: string;
  artist: string;
  year: number;
  genre: "Hip-Hop" | "Pop" | "Rock" | "Indie" | "R&B" | "Electronic";
  coverUrl?: string;
  /** Two hues for the generated cover when no artwork URL is available. */
  hues: [number, number];
  tracks: string[];
};

export interface MusicSource {
  search(query: string): Promise<Album[]>;
  getAlbum(id: string): Promise<Album | null>;
  trending(): Promise<Album[]>;
}

const ALBUMS: Album[] = [
  { id: "to-pimp-a-butterfly", title: "To Pimp a Butterfly", artist: "Kendrick Lamar", year: 2015, genre: "Hip-Hop", hues: [40, 10],
    tracks: ["Wesley's Theory", "For Free? (Interlude)", "King Kunta", "Institutionalized", "These Walls", "u", "Alright", "For Sale? (Interlude)", "Momma", "Hood Politics", "How Much a Dollar Cost", "Complexion (A Zulu Love)", "The Blacker the Berry", "You Ain't Gotta Lie (Momma Said)", "i", "Mortal Man"] },
  { id: "blonde", title: "Blonde", artist: "Frank Ocean", year: 2016, genre: "R&B", hues: [140, 60],
    tracks: ["Nikes", "Ivy", "Pink + White", "Be Yourself", "Solo", "Skyline To", "Self Control", "Good Guy", "Nights", "Solo (Reprise)", "Pretty Sweet", "Facebook Story", "Close to You", "White Ferrari", "Seigfried", "Godspeed", "Futura Free"] },
  { id: "ok-computer", title: "OK Computer", artist: "Radiohead", year: 1997, genre: "Rock", hues: [210, 180],
    tracks: ["Airbag", "Paranoid Android", "Subterranean Homesick Alien", "Exit Music (For a Film)", "Let Down", "Karma Police", "Fitter Happier", "Electioneering", "Climbing Up the Walls", "No Surprises", "Lucky", "The Tourist"] },
  { id: "rumours", title: "Rumours", artist: "Fleetwood Mac", year: 1977, genre: "Rock", hues: [30, 350],
    tracks: ["Second Hand News", "Dreams", "Never Going Back Again", "Don't Stop", "Go Your Own Way", "Songbird", "The Chain", "You Make Loving Fun", "I Don't Want to Know", "Oh Daddy", "Gold Dust Woman"] },
  { id: "igor", title: "IGOR", artist: "Tyler, The Creator", year: 2019, genre: "Hip-Hop", hues: [340, 320],
    tracks: ["IGOR'S THEME", "EARFQUAKE", "I THINK", "EXACTLY WHAT YOU RUN FROM YOU END UP CHASING", "RUNNING OUT OF TIME", "NEW MAGIC WAND", "A BOY IS A GUN*", "PUPPET", "WHAT'S GOOD", "GONE, GONE / THANK YOU", "I DON'T LOVE YOU ANYMORE", "ARE WE STILL FRIENDS?"] },
  { id: "midnights", title: "Midnights", artist: "Taylor Swift", year: 2022, genre: "Pop", hues: [240, 220],
    tracks: ["Lavender Haze", "Maroon", "Anti-Hero", "Snow on the Beach", "You're On Your Own, Kid", "Midnight Rain", "Question...?", "Vigilante Shit", "Bejeweled", "Labyrinth", "Karma", "Sweet Nothing", "Mastermind"] },
  { id: "am", title: "AM", artist: "Arctic Monkeys", year: 2013, genre: "Indie", hues: [0, 260],
    tracks: ["Do I Wanna Know?", "R U Mine?", "One for the Road", "Arabella", "I Want It All", "No. 1 Party Anthem", "Mad Sounds", "Fireside", "Why'd You Only Call Me When You're High?", "Snap Out of It", "Knee Socks", "I Wanna Be Yours"] },
  { id: "currents", title: "Currents", artist: "Tame Impala", year: 2015, genre: "Indie", hues: [280, 20],
    tracks: ["Let It Happen", "Nangs", "The Moment", "Yes I'm Changing", "Eventually", "Gossip", "The Less I Know the Better", "Past Life", "Disciples", "'Cause I'm a Man", "Reality in Motion", "Love/Paranoia", "New Person, Same Old Mistakes"] },
  { id: "random-access-memories", title: "Random Access Memories", artist: "Daft Punk", year: 2013, genre: "Electronic", hues: [50, 200],
    tracks: ["Give Life Back to Music", "The Game of Love", "Giorgio by Moroder", "Within", "Instant Crush", "Lose Yourself to Dance", "Touch", "Get Lucky", "Beyond", "Motherboard", "Fragments of Time", "Doin' It Right", "Contact"] },
  { id: "brat", title: "BRAT", artist: "Charli xcx", year: 2024, genre: "Pop", hues: [110, 95],
    tracks: ["360", "Club classics", "Sympathy is a knife", "I might say something stupid", "Talk talk", "Von dutch", "Everything is romantic", "Rewind", "So I", "Girl, so confusing", "Apple", "B2b", "Mean girls", "I think about it all the time", "365"] },
  { id: "in-rainbows", title: "In Rainbows", artist: "Radiohead", year: 2007, genre: "Rock", hues: [15, 160],
    tracks: ["15 Step", "Bodysnatchers", "Nude", "Weird Fishes/Arpeggi", "All I Need", "Faust Arp", "Reckoner", "House of Cards", "Jigsaw Falling into Place", "Videotape"] },
  { id: "nevermind", title: "Nevermind", artist: "Nirvana", year: 1991, genre: "Rock", hues: [200, 230],
    tracks: ["Smells Like Teen Spirit", "In Bloom", "Come as You Are", "Breed", "Lithium", "Polly", "Territorial Pissings", "Drain You", "Lounge Act", "Stay Away", "On a Plain", "Something in the Way"] },
  { id: "sos", title: "SOS", artist: "SZA", year: 2022, genre: "R&B", hues: [220, 190],
    tracks: ["SOS", "Kill Bill", "Seek & Destroy", "Low", "Love Language", "Blind", "Used", "Snooze", "Notice Me", "Gone Girl", "Smoking on My Ex Pack", "Ghost in the Machine", "F2F", "Nobody Gets Me", "Conceited", "Special", "Too Late", "Far", "Shirt", "Open Arms", "I Hate U", "Good Days", "Forgiveless"] },
  { id: "punisher", title: "Punisher", artist: "Phoebe Bridgers", year: 2020, genre: "Indie", hues: [270, 300],
    tracks: ["DVD Menu", "Garden Song", "Kyoto", "Punisher", "Halloween", "Chinese Satellite", "Moon Song", "Savior Complex", "ICU", "Graceland Too", "I Know the End"] },
];

const TRENDING_IDS = ["brat", "sos", "igor", "midnights", "currents", "to-pimp-a-butterfly", "am", "punisher"];

export const mockMusicSource: MusicSource = {
  async search(query) {
    const q = query.trim().toLowerCase();
    if (!q) return ALBUMS;
    return ALBUMS.filter((a) =>
      [a.title, a.artist, a.genre, String(a.year)].some((f) => f.toLowerCase().includes(q)),
    );
  },
  async getAlbum(id) {
    return ALBUMS.find((a) => a.id === id) ?? null;
  },
  async trending() {
    return TRENDING_IDS.map((id) => ALBUMS.find((a) => a.id === id)!).filter(Boolean);
  },
};

/** Active source — replace with a Spotify implementation later. */
export const musicSource: MusicSource = mockMusicSource;

/** Synchronous lookup for rendering cached review rows. */
export const getAlbumSync = (id: string) => ALBUMS.find((a) => a.id === id) ?? null;
