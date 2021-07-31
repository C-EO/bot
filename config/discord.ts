import {
  ClientOptions,
  HTTPOptions,
  Constants,
  Intents,
  Options,
} from "discord.js";
import { FireMessage } from "@fire/lib/extensions/message";

let litecord: { http?: HTTPOptions } = {};
if (process.env.USE_LITECORD == "true")
  litecord = {
    http: {
      api: process.env.LITECORD_HOST,
      cdn: process.env.LITECORD_CDN,
      version: parseInt(process.env.LITECORD_VERSION),
    },
  };

export const discord: ClientOptions = {
  allowedMentions: {
    repliedUser: false,
    parse: [],
    users: [],
    roles: [],
  },
  makeCache: Options.cacheWithLimits({
    MessageManager: {
      sweepFilter: () => {
        return (message: FireMessage) =>
          +new Date() - (message.editedTimestamp ?? message.createdTimestamp) >
          150000;
      },
      sweepInterval: 60,
    },
    PresenceManager: 0,
    // @ts-ignore ABSOLUTE FUCKING GREMLIN AAAAAAAAAAAAAAAA
    GuildInviteManager: 0,
  }),
  restSweepInterval: 30,
  partials: [
    Constants.PartialTypes.GUILD_MEMBER,
    Constants.PartialTypes.REACTION,
    Constants.PartialTypes.MESSAGE,
    Constants.PartialTypes.CHANNEL,
    Constants.PartialTypes.USER,
  ],
  intents:
    Intents.FLAGS.GUILDS |
    Intents.FLAGS.GUILD_MEMBERS |
    // Intents.FLAGS.GUILD_PRESENCES |
    Intents.FLAGS.GUILD_VOICE_STATES |
    Intents.FLAGS.GUILD_BANS |
    Intents.FLAGS.GUILD_INVITES |
    Intents.FLAGS.GUILD_MESSAGES |
    Intents.FLAGS.GUILD_MESSAGE_REACTIONS |
    Intents.FLAGS.GUILD_WEBHOOKS |
    Intents.FLAGS.DIRECT_MESSAGES |
    Intents.FLAGS.GUILD_VOICE_STATES,
  ...litecord,
  presence: {
    status: "idle",
    activities: [{ name: "things load...", type: "WATCHING" }],
  },
};
