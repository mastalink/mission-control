import type { AgentListItem } from "../gateway/types";
import { CHARACTER_ASSIGNMENT_ORDER } from "./registry";
import type { CharacterAssignment } from "./types";

/**
 * Auto-assign Office characters to agents.
 * Default agent always gets Michael Scott.
 * Additional agents assigned in show order.
 */
export function autoAssignCharacters(
  agents: AgentListItem[],
  defaultAgentId: string | undefined,
  userOverrides: Record<string, string>,
  instanceId: string,
): CharacterAssignment[] {
  const assignments: CharacterAssignment[] = [];
  const usedCharacters = new Set<string>();

  // Apply user overrides first
  for (const agent of agents) {
    const override = userOverrides[agent.id];
    if (override) {
      assignments.push({
        agentId: agent.id,
        characterId: override,
        instanceId,
        isUserAssigned: true,
      });
      usedCharacters.add(override);
    }
  }

  // Default agent always gets Michael Scott (if not overridden)
  if (defaultAgentId) {
    const defaultAgent = agents.find((a) => a.id === defaultAgentId);
    if (defaultAgent && !assignments.find((a) => a.agentId === defaultAgent.id)) {
      if (!usedCharacters.has("michael-scott")) {
        assignments.push({
          agentId: defaultAgent.id,
          characterId: "michael-scott",
          instanceId,
          isUserAssigned: false,
        });
        usedCharacters.add("michael-scott");
      }
    }
  }

  // Assign remaining agents in order
  const unassigned = agents.filter((a) => !assignments.find((x) => x.agentId === a.id));
  let orderIdx = 0;

  for (const agent of unassigned) {
    while (orderIdx < CHARACTER_ASSIGNMENT_ORDER.length && usedCharacters.has(CHARACTER_ASSIGNMENT_ORDER[orderIdx]!)) {
      orderIdx++;
    }
    const characterId =
      orderIdx < CHARACTER_ASSIGNMENT_ORDER.length
        ? CHARACTER_ASSIGNMENT_ORDER[orderIdx]!
        : `placeholder-${orderIdx}`;
    assignments.push({ agentId: agent.id, characterId, instanceId, isUserAssigned: false });
    usedCharacters.add(characterId);
    orderIdx++;
  }

  return assignments;
}
