---
timestamp: 'Tue Oct 21 2025 15:03:39 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251021_150339.6b2669e3.md]]'
content_id: 22122b86e0867a3db08d3c377610156cd85e25e6c006c29a817eb6a254707cf2
---

# file: src/concepts/PlatformLink/PlatformLinkConcept.ts

```typescript
import { Collection, Db } from "npm:mongodb";
import { freshID } from "@utils/database.ts";
import { ID } from "@utils/types.ts";

// Generic types of this concept. User is an external, polymorphic type.
type User = ID;
type LinkId = ID;
type CapabilityId = ID;

const PREFIX = "PlatformLink.";
const SUPPORTED_PLATFORMS = ["spotify", "youtube_music"];
const TOKEN_LIFESPAN_MS = 3600 * 1000; // 1 hour

/**
 * State representation for a user known to this concept.
 * Corresponds to:
 *   A set of `Users` with
 *     - a `userId` of type `String` (mapped to `_id`)
 *     - a `createdAt` timestamp of type `Float`
 */
interface UserDoc {
  _id: User;
  createdAt: number;
}

/**
 * State representation for a platform link.
 * Corresponds to:
 *   A set of `Links` with
 *     - a `linkId` of type `String` (mapped to `_id`)
 *     - a `userId` of type `String`
 *     - a `platform` of type `String`
 *     - an `accessToken` of type `String`
 *     - an `tokenExpiration` timestamp of type `Float`
 */
interface LinkDoc {
  _id: LinkId;
  userId: User;
  platform: string;
  accessToken: string;
  tokenExpiration: number;
}

/**
 * State representation for a capability associated with a link.
 * Corresponds to:
 *   A set of `Capabilities` with
 *     - a `linkId` of type `String`
 *     - a `capability` of type `String`
 */
interface CapabilityDoc {
  _id: CapabilityId;
  linkId: LinkId;
  capability: string;
}

/**
 * concept: PlatformLink [User]
 * purpose: Provide authenthicated access to a streaming platform. Give other concepts a safe way of talking to the streaming platform without leaking tokens.
 * principle: When a user links their streaming platform account, the app can verify capabilities and renew tokens on their behalf without other concepts ever touching credentials.
 */
export default class PlatformLinkConcept {
  private readonly users: Collection<UserDoc>;
  private readonly links: Collection<LinkDoc>;
  private readonly capabilities: Collection<CapabilityDoc>;

  constructor(private readonly db: Db) {
    this.users = db.collection<UserDoc>(PREFIX + "users");
    this.links = db.collection<LinkDoc>(PREFIX + "links");
    this.capabilities = db.collection<CapabilityDoc>(PREFIX + "capabilities");
  }

  /**
   * Creates a new link to a streaming platform for a given user.
   *
   * requires: userId is valid, platform is supported, NO existing link for the user/platform combination.
   * effects: Creates and returns a new link record. Stores a new access token and expiration time. If the user is new to this concept, a corresponding user record is also created.
   */
  async link({ userId, platform }: { userId: User; platform: string }): Promise<{ linkId: LinkId } | { error: string }> {
    if (!SUPPORTED_PLATFORMS.includes(platform)) {
      return { error: `Platform '${platform}' is not supported.` };
    }

    const existingLink = await this.links.findOne({ userId, platform });
    if (existingLink) {
      return { error: `User already has a link for platform '${platform}'.` };
    }

    // This concept now "knows" about this user.
    await this.users.updateOne({ _id: userId }, { $setOnInsert: { createdAt: Date.now() } }, { upsert: true });

    const newLinkId = freshID() as LinkId;
    const newLink: LinkDoc = {
      _id: newLinkId,
      userId,
      platform,
      accessToken: `dummy_token_${freshID()}`, // In a real app, this comes from an OAuth flow
      tokenExpiration: Date.now() + TOKEN_LIFESPAN_MS,
    };

    await this.links.insertOne(newLink);

    return { linkId: newLinkId };
  }

  /**
   * Refreshes the access token for an existing link.
   *
   * requires: link exists.
   * effects: Updates accessToken, prolongs and returns new expiration time.
   */
  async refresh({ linkId }: { linkId: LinkId }): Promise<{ newExpiration: number } | { error: string }> {
    const link = await this.links.findOne({ _id: linkId });
    if (!link) {
      return { error: `Link with id '${linkId}' not found.` };
    }

    const newExpiration = Date.now() + TOKEN_LIFESPAN_MS;
    const newAccessToken = `dummy_token_${freshID()}`;

    const { matchedCount } = await this.links.updateOne({ _id: linkId }, { $set: { tokenExpiration: newExpiration, accessToken: newAccessToken } });

    if (matchedCount === 0) {
      return { error: `Link with id '${linkId}' not found during update.` };
    }

    return { newExpiration };
  }

  /**
   * Revokes a user's link to a platform, deleting all associated data.
   *
   * requires: Link exists.
   * effects: Deletes the link and any associated capabilities.
   */
  async revoke({ linkId }: { linkId: LinkId }): Promise<{ removed: boolean } | { error: string }> {
    const link = await this.links.findOne({ _id: linkId });
    if (!link) {
      return { error: `Link with id '${linkId}' not found.` };
    }

    // Delete associated capabilities first
    await this.capabilities.deleteMany({ linkId });

    // Then delete the link itself
    const deleteResult = await this.links.deleteOne({ _id: linkId });

    return { removed: deleteResult.deletedCount > 0 };
  }

  /**
   * Checks if a link is active and possesses a specific capability.
   *
   * effects: returns whether a Link has the needed access and availability.
   *          Simply put, returns whether a capability exists for the link and the token is not expired.
   */
  async can({ linkId, capability }: { linkId: LinkId; capability: string }): Promise<{ ok: boolean }> {
    const link = await this.links.findOne({ _id: linkId });

    if (!link) {
      return { ok: false };
    }

    if (link.tokenExpiration < Date.now()) {
      return { ok: false };
    }

    const hasCapability = await this.capabilities.findOne({ linkId, capability });

    return { ok: !!hasCapability };
  }
}
```

## LibraryCache

Specification:
