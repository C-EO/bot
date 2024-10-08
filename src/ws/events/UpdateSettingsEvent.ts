import { Manager } from "@fire/lib/Manager";
import { FireGuild } from "@fire/lib/extensions/guild";
import { FireUser } from "@fire/lib/extensions/user";
import { GuildSettings, UserSettings } from "@fire/lib/util/settings";
import { Message } from "@fire/lib/ws/Message";
import { Event } from "@fire/lib/ws/event/Event";
import { MessageUtil } from "@fire/lib/ws/util/MessageUtil";
import { EventType } from "@fire/lib/ws/util/constants";
import { Snowflake } from "discord.js";

type Primitive = string | boolean | number | null;

export default class UpdateSettingsEvent extends Event {
  constructor(manager: Manager) {
    super(manager, EventType.UPDATE_SETTINGS);
  }

  async run(
    data: {
      type: "user" | "guild";
      id: Snowflake;
      setting: string;
      value: Primitive | Primitive[];
    },
    nonce: string
  ) {
    let settings: UserSettings | GuildSettings;
    if (data.type == "user") {
      const userSettings = this.manager.client.userSettings;
      const user = (await this.manager.client.users
        .fetch(data.id)
        .catch(() => {})) as FireUser;
      if (!user)
        return this.manager.ws.send(
          MessageUtil.encode(
            new Message(
              EventType.UPDATE_SETTINGS,
              { success: false, reason: "Unknown User" },
              nonce
            )
          )
        );
      if (!userSettings.items.has(user.id)) await userSettings.init(user.id);
      settings = user.settings;
    } else if (data.type == "guild") {
      const guildSettings = this.manager.client.guildSettings;
      const guild = this.manager.client.guilds.cache.get(data.id) as FireGuild;
      if (!guild)
        return this.manager.ws.send(
          MessageUtil.encode(
            new Message(
              EventType.UPDATE_SETTINGS,
              { success: false, reason: "Unknown Guild" },
              nonce
            )
          )
        );
      if (!guildSettings.items.has(guild.id))
        await guildSettings.init(guild.id);
      settings = guild.settings;
    }

    let success = false;

    if (data.value != "deleteSetting") {
      await settings.set(data.setting, data.value);
      success = settings.get(data.setting) == data.value;
    } else {
      await settings.delete(data.setting);
      success = !settings.has(data.setting);
    }

    return this.manager.ws.send(
      MessageUtil.encode(
        new Message(EventType.UPDATE_SETTINGS, { success }, nonce)
      )
    );
  }
}
