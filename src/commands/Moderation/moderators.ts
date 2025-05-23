import { ApplicationCommandMessage } from "@fire/lib/extensions/appcommandmessage";
import { FireMember } from "@fire/lib/extensions/guildmember";
import { Command } from "@fire/lib/util/command";
import { Language } from "@fire/lib/util/language";
import { Snowflake } from "discord-api-types/globals";
import { MessageEmbed } from "discord.js";

export default class Moderators extends Command {
  constructor() {
    super("moderators", {
      description: (language: Language) =>
        language.get("MODERATORS_COMMAND_DESCRIPTION"),
      args: [],
      enableSlashCommand: true,
      restrictTo: "guild",
      slashOnly: true,
      ephemeral: true,
      group: true,
    });
  }

  async run(command: ApplicationCommandMessage) {}

  async getModeratorEmbed(command: ApplicationCommandMessage) {
    const moderators = command.guild.settings.get<Snowflake[]>(
      "utils.moderators",
      []
    );
    if (!moderators.length) return await command.error("NO_MODERATORS_SET");
    const roles = moderators.filter((id) => command.guild.roles.cache.has(id));
    const members = await command.guild.members.fetch({
      user: moderators.filter((id) => !roles.includes(id)),
    });
    const mentions = {
      roles: roles.map((rid) => `<@&${rid}>`),
      members: members.map((member: FireMember) => member.toMention()),
    };
    const invalid = [
      ...moderators.filter(
        (id) => !roles.includes(id) && !members.find((m) => m.id == id)
      ),
    ];
    let filteredModerators = moderators.filter((id) => !invalid.includes(id));
    if (moderators != filteredModerators)
      await command.guild.settings.set<string[]>(
        "utils.moderators",
        filteredModerators,
        command.author
      );
    const embed = new MessageEmbed()
      .setColor(command.member?.displayColor || "#FFFFFF")
      .addFields([
        {
          name: command.language.get("MODERATORS_ROLES"),
          value:
            mentions.roles.join("\n") ||
            command.language.get("NO_MODERATOR_ROLES"),
        },
        {
          name: command.language.get("MODERATORS_MEMBERS"),
          value:
            mentions.members.join("\n") ||
            command.language.get("NO_MODERATOR_MEMBERS"),
        },
      ]);
    if (invalid.length)
      embed.addFields({
        name: command.language.get("MODERATORS_REMOVE_INVALID"),
        value: command.language.get("MODERATORS_REMOVED", {
          invalid: invalid.join(", "),
        }),
      });
    return await command.channel.send({ embeds: [embed] });
  }
}
