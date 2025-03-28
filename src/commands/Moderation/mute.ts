import { ApplicationCommandMessage } from "@fire/lib/extensions/appcommandmessage";
import { FireMember } from "@fire/lib/extensions/guildmember";
import { Command } from "@fire/lib/util/command";
import { Language } from "@fire/lib/util/language";
import { ParsedTime } from "@fire/src/arguments/time";
import { PermissionFlagsBits } from "discord-api-types/v9";

export default class Mute extends Command {
  constructor() {
    super("mute", {
      description: (language: Language) =>
        language.get("MUTE_COMMAND_DESCRIPTION"),
      args: [
        {
          id: "user",
          type: "memberSilent",
          description: (language: Language) =>
            language.get("MUTE_ARGUMENT_USER_DESCRIPTION"),
          required: true,
          default: null,
        },
        {
          id: "reason",
          type: "string",
          description: (language: Language) =>
            language.get("MUTE_ARGUMENT_REASON_DESCRIPTION"),
          required: false,
          default: null,
          match: "rest",
        },
        {
          id: "time",
          type: "time",
          description: (language: Language) =>
            language.get("MUTE_ARGUMENT_TIME_DESCRIPTION"),
          required: false,
          default: null,
          match: "rest",
        },
      ],
      clientPermissions: [
        PermissionFlagsBits.ModerateMembers,
        PermissionFlagsBits.ManageChannels,
        PermissionFlagsBits.ManageRoles,
      ],
      enableSlashCommand: true,
      restrictTo: "guild",
      moderatorOnly: true,
      deferAnyways: true,
      slashOnly: true,
      ephemeral: true,
    });
  }

  async run(
    command: ApplicationCommandMessage,
    args: { user: FireMember; reason?: string; time?: ParsedTime }
  ) {
    if (!args.user) return await command.error("MUTE_USER_REQUIRED");
    else if (
      args.user instanceof FireMember &&
      (args.user.isModerator(command.channel) || args.user.user.bot) &&
      command.author.id != command.guild.ownerId
    )
      return await command.error("MODERATOR_ACTION_DISALLOWED");
    const muteUntil = args.time?.date;
    const muted = await args.user.mute(
      args.reason?.trim() ||
        (command.guild.language.get(
          "MODERATOR_ACTION_DEFAULT_REASON"
        ) as string),
      command.member,
      muteUntil ? +muteUntil : undefined,
      command.channel
    );
    if (muted == "FORBIDDEN")
      return await command.error("COMMAND_MODERATOR_ONLY");
    else if (typeof muted == "string")
      return await command.error(`MUTE_FAILED_${muted}`);
  }
}
