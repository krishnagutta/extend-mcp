import { z } from 'zod';
import { wdcliRaw } from '../wdcli.mjs';
import { isValidReferenceId } from '../workspace.mjs';
import { checkPromotion, buildPromoteArgs, PROMOTION_LEVELS } from '../promote-guard.mjs';
import { ok, err } from '../respond.mjs';

export function register(server) {
  server.tool(
    'promote_extend_app',
    'Promote an app version one level up (development → implementation → sandbox → production). This is outward-visible — production promotion publishes the app — so it requires an explicit human confirmation string: ask the user to type exactly "PROMOTE <referenceId> v<version> TO <LEVEL>" and pass it as confirm. Never construct that string yourself; a promotion the user did not literally type is not authorised. Version is required (no --latest-version: the latest build is not necessarily the most promoted one).',
    {
      reference_id: z.string().describe('App referenceId (e.g. myApp_gvptzl)'),
      version: z.string().describe('Exact version number to promote (from list_extend_app_versions). Required — no latest shortcut.'),
      target_level: z.enum(PROMOTION_LEVELS).describe('Target level. wdcli only permits one level up per promotion.'),
      release_notes: z.string().optional().describe('Release notes accompanying the promotion'),
      confirm: z.string().optional().describe('The exact confirmation string, typed by the human user'),
    },
    async ({ reference_id, version, target_level, release_notes, confirm }) => {
      if (!isValidReferenceId(reference_id)) {
        return err('INVALID_REFERENCE_ID', `'${reference_id}' is not a valid referenceId.`, 'Use list_extend_apps to find the exact referenceId.');
      }

      const gate = checkPromotion({ referenceId: reference_id, version, level: target_level, confirm });
      if (!gate.ok) {
        return err(
          'CONFIRMATION_REQUIRED',
          `Promotion to ${target_level} requires explicit human confirmation.`,
          `Ask the user to type exactly: ${gate.expected} — then pass it as confirm. Do not fabricate it on their behalf.`
        );
      }

      const result = await wdcliRaw(
        buildPromoteArgs({ referenceId: reference_id, version, level: target_level, releaseNotes: release_notes }),
        { timeout: 180_000 }
      );

      return ok({
        success: result.ok,
        reference_id,
        version,
        target_level,
        output: result.data ?? result.error,
        ...(result.auth ? { auth_failure: result.auth } : {}),
      });
    }
  );
}
