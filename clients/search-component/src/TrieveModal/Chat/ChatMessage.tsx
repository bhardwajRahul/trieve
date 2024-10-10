import * as React from "react";
import {
  AIIcon,
  LoadingIcon,
  ThumbsDownIcon,
  ThumbsUpIcon,
  UserIcon,
} from "../icons";
import Markdown from "react-markdown";
import SyntaxHighlighter from "react-syntax-highlighter";
import { nightOwl } from "react-syntax-highlighter/dist/esm/styles/hljs";
import { Chunk } from "../../utils/types";
import { useModalState } from "../../utils/hooks/modal-context";
import { useChatState } from "../../utils/hooks/chat-context";

type Message = {
  queryId: string | null;
  type: string;
  text: string;
  additional: Chunk[] | null;
};

export const ChatMessage = ({
  message,
  idx,
}: {
  message: Message;
  idx: number;
}) => {
  const { props } = useModalState();
  return (
    <>
      {message.type == "user" ? (
        <>
          <span className="ai-avatar user">
            <UserIcon />
            <p
              className="tag"
              // style mostly transparent brand color
              style={{
                backgroundColor: props.brandColor
                  ? `${props.brandColor}18`
                  : "#CB53EB18",
                color: props.brandColor ?? "#CB53EB",
              }}>
              User
            </p>
          </span>
          <div className={message.type}>
            <span className="user-text"> {message.text}</span>
          </div>
        </>
      ) : (
        <>
          <span className="ai-avatar assistant">
            {props.brandLogoImgSrcUrl ? (
              <img
                src={props.brandLogoImgSrcUrl}
                alt={props.brandName || "Brand logo"}
              />
            ) : (
              <AIIcon />
            )}
            <p
              className="tag"
              // style mostly transparent brand color
              style={{
                backgroundColor: props.brandColor
                  ? `${props.brandColor}18`
                  : "#CB53EB18",
                color: props.brandColor ?? "#CB53EB",
              }}>
              AI assistant
            </p>
          </span>
          <Message key={idx} message={message} idx={idx} />
        </>
      )}
    </>
  );
};

export const Message = ({
  message,
  idx,
}: {
  idx: number;
  message: Message;
}) => {
  const { rateChatCompletion } = useChatState();
  const [positive, setPositive] = React.useState<boolean | null>(null);
  const { props } = useModalState();

  return (
    <div>
      {message.text == "Loading..." ? (
        <div className="system">
          <LoadingIcon className="loading" />
        </div>
      ) : null}
      {message.type === "system" && message.text != "Loading..." ? (
        <div className="system">
          <Markdown
            components={{
              code: (props) => {
                const { className, children } = props || {};
                if (!children) return null;
                if (!className) {
                  return (
                    <SyntaxHighlighter language={"bash"} style={nightOwl}>
                      {children?.toString()}
                    </SyntaxHighlighter>
                  );
                }
                return (
                  <SyntaxHighlighter
                    language={className?.split("language")[1] || "bash"}
                    style={nightOwl}>
                    {children?.toString()}
                  </SyntaxHighlighter>
                );
              },
            }}
            key={idx}>
            {message.text}
          </Markdown>
          <div>
            {message.additional ? (
              props.type === "ecommerce" ? (
                <div className="additional-image-links">
                  {message.additional
                    .filter(
                      (chunk) =>
                        (chunk.metadata.heading ||
                          chunk.metadata.title ||
                          chunk.metadata.page_title) &&
                        chunk.link &&
                        chunk.image_urls?.length &&
                        chunk.num_value,
                    )
                    .map((chunk) => ({
                      title:
                        chunk.metadata.heading ||
                        chunk.metadata.title ||
                        chunk.metadata.page_title,
                      link: chunk.link,
                      imageUrl: (chunk.image_urls ?? [])[0],
                      price: chunk.num_value,
                    }))
                    .filter(
                      (item, index, array) =>
                        array.findIndex(
                          (arrayItem) => arrayItem.title === item.title,
                        ) === index && item.title,
                    )
                    .map((item, index) => (
                      <a
                        key={index}
                        href={item.link ?? ""}
                        target="_blank"
                        rel="noopener noreferrer">
                        <img
                          src={item.imageUrl ?? ""}
                          alt={item.title}
                          className="ecommerce-featured-image-chat"
                        />
                        <div className="ecomm-details">
                          <p className="ecomm-item-title">{item.title}</p>
                          <p
                            className="ecomm-item-price"
                            style={{
                              color: props.brandColor ?? "#CB53EB",
                            }}>
                            ${item.price}
                          </p>
                        </div>
                      </a>
                    ))}
                </div>
              ) : (
                <div className="additional-links">
                  {message.additional
                    .filter(
                      (chunk) =>
                        (chunk.metadata.heading ||
                          chunk.metadata.title ||
                          chunk.metadata.page_title) &&
                        chunk.link,
                    )
                    .map((chunk) => [
                      chunk.metadata.heading ||
                        chunk.metadata.title ||
                        chunk.metadata.page_title,
                      chunk.link,
                    ])
                    .filter(
                      (link, index, array) =>
                        array.findIndex((item) => item[0] === link[0]) ===
                          index && link[0],
                    )
                    .map((link, index) => (
                      <a key={index} href={link[1] as string} target="_blank">
                        {link[0]}
                      </a>
                    ))}
                </div>
              )
            ) : null}
            <div className="feedback-wrapper">
              <span className="spacer"></span>
              <div className="feedback-icons">
                <button
                  className={positive != null && positive ? "icon-darken" : ""}
                  onClick={() => {
                    rateChatCompletion(true, message.queryId);
                    setPositive(true);
                  }}>
                  <ThumbsUpIcon />
                </button>
                <button
                  className={positive != null && !positive ? "icon-darken" : ""}
                  onClick={() => {
                    rateChatCompletion(false, message.queryId);
                    setPositive(false);
                  }}>
                  <ThumbsDownIcon />
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
