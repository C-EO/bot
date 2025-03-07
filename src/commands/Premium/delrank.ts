import { FireMessage } from "@fire/lib/extensions/message";
import { Command } from "@fire/lib/util/command";
import { Language } from "@fire/lib/util/language";
import { PermissionFlagsBits } from "discord-api-types/v9";
import { Role } from "discord.js";

export default class DelRank extends Command {
  constructor() {
    super("delrank", {
      description: (language: Language) =>
        language.get("DELRANK_COMMAND_DESCRIPTION"),
      clientPermissions: [
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ManageRoles,
        PermissionFlagsBits.EmbedLinks,
      ],
      userPermissions: [PermissionFlagsBits.ManageRoles],
      restrictTo: "guild",
      args: [
        {
          id: "role",
          type: "role",
          default: null,
          required: true,
        },
      ],
      aliases: ["delselfrole", "deljoinrole", "deljoinablerole", "delselfrank"],
      enableSlashCommand: true,
      premium: true,
    });
  }

  async exec(message: FireMessage, args: { role?: Role }) {
    if (!args.role) return;
    if (
      args.role &&
      (args.role.managed ||
        args.role.rawPosition >=
          message.guild.members.me.roles.highest.rawPosition ||
        args.role.id == message.guild.roles.everyone.id ||
        (args.role.rawPosition >= message.member.roles.highest.rawPosition &&
          message.guild.ownerId != message.author.id))
    )
      return await message.error("ERROR_ROLE_UNUSABLE");

    let current = message.guild.settings.get<string[]>("utils.ranks", []);
    if (!current.includes(args.role.id))
      return await message.error("RANKS_INVALID_ROLE_DEL");
    else {
      current = current.filter((id) => id != args.role?.id);
      if (current.length)
        await message.guild.settings.set<string[]>(
          "utils.ranks",
          current,
          message.author
        );
      else await message.guild.settings.delete("utils.ranks", message.author);
      return await message.success("DELRANK_DELETED");
    }
  }
}
