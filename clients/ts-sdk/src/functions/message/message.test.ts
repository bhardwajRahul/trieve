import { beforeAll, describe, expectTypeOf } from "vitest";
import { TrieveSDK } from "../../sdk";
import { Message } from "../../types.gen";
import { EXAMPLE_TOPIC_ID, TRIEVE } from "../../__tests__/constants";
import { test } from "../../__tests__/utils";

describe("Message Tests", async () => {
  let trieve: TrieveSDK;
  beforeAll(() => {
    trieve = TRIEVE;
  });
  test("createMessage", async () => {
    const data = await trieve.createMessage({
      topic_id: EXAMPLE_TOPIC_ID,
      new_message_content: "test",
    });

    expectTypeOf(data).toEqualTypeOf<string>();
  });
  test("editMessage", async () => {
    const data = await trieve.editMessage({
      message_sort_order: 1,
      new_message_content: "test2",
      topic_id: EXAMPLE_TOPIC_ID,
    });

    expectTypeOf(data).toEqualTypeOf<string>();
  });

  test("regenerateMessage", async () => {
    const data = await trieve.regenerateMessage({
      topic_id: EXAMPLE_TOPIC_ID,
      search_query: "test",
      search_type: "fulltext",
    });

    expectTypeOf(data).toEqualTypeOf<string>();
  });
  test("getAllMessagesForTopic", async () => {
    const data = await trieve.getAllMessagesForTopic({
      messagesTopicId: EXAMPLE_TOPIC_ID,
    });

    expectTypeOf(data).toEqualTypeOf<Message[]>();
  });
});
