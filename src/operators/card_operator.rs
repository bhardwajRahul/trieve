use openai_dive::v1::{api::Client, resources::embedding::EmbeddingParameters};
use qdrant_client::{prelude::{QdrantClient, QdrantClientConfig}, qdrant::{value::Kind, point_id::PointIdOptions, SearchPoints, PointId, RetrievedPoint}};
use serde::{Serialize, Deserialize};

use crate::errors::DefaultError;

pub async fn get_qdrant_connection() -> Result<QdrantClient, DefaultError> {
    let qdrant_url = std::env::var("QDRANT_URL").expect("QDRANT_URL must be set");
    QdrantClient::new(Some(QdrantClientConfig::from_url(qdrant_url.as_str())))
        .await
        .map_err(|_err| DefaultError {
            message: "Failed to connect to Qdrant",
        })
}

pub async fn create_openai_embedding(message: &str) -> Result<Vec<f32>, actix_web::Error> {
    let open_ai_api_key = std::env::var("OPENAI_API_KEY").expect("OPENAI_API_KEY must be set");
    let client = Client::new(open_ai_api_key);

    // Vectorize
    let parameters = EmbeddingParameters {
        model: "text-embedding-ada-002".to_string(),
        input: message.to_string(),
    };

    let embeddings = client
        .embeddings()
        .create(parameters)
        .await
        .map_err(actix_web::error::ErrorBadRequest)?;

    let vector = embeddings.data.get(0).unwrap().embedding.clone();
    Ok(vector.iter().map(|&x| x as f32).collect())
}

#[derive(Serialize, Deserialize)]
pub struct ScoredCardDTO {
    id: String,
    content: String,
    side: String,
    topic: String,
    score: f32,
    votes: i64,
    link: Option<String>,
}

pub async fn search_card_query(embedding_vector: Vec<f32>, page: u64) -> Result<Vec<ScoredCardDTO>, actix_web::Error> {
    let qdrant = get_qdrant_connection()
        .await
        .map_err(|err| actix_web::error::ErrorBadRequest(err.message))?;

    log::info!("Searching for cards with vector: limit {:?}", Some((page-1) * 10));
    let data = qdrant
        .search_points(&SearchPoints {
            collection_name: "debate_cards".to_string(),
            vector: embedding_vector,
            limit: 25,
            offset: Some((page-1) * 25),
            with_payload: Some(vec![
            "content",
            "side",
            "topic",
            "user_id",
            "link",
            "upvotes",
            "downvotes",
            ].into()),
            ..Default::default()
        })
        .await
        .map_err(actix_web::error::ErrorBadRequest)?;

    let cards: Vec<ScoredCardDTO> = data
        .result
        .iter()
        .filter_map(|point| {
            let id = match point.id.clone()?.point_id_options? {
                PointIdOptions::Num(n) => n.to_string(),
                PointIdOptions::Uuid(s) => s,
            };
            let content = point.payload.get("content")?;
            let side = point.payload.get("side")?;
            let topic = point.payload.get("topic")?;
            let upvotes = point.payload.get("upvotes")?;
            let downvotes = point.payload.get("downvotes")?;
            let score = point.score;
            let link = point.payload.get("link").and_then(|link| {
                if let Some(Kind::StringValue(s)) = &link.kind {
                    Some(s.clone())
                } else {
                    None
                }
            });

            match (&content.kind, &side.kind, &topic.kind, &upvotes.kind, &downvotes.kind) {
                (
                    Some(Kind::StringValue(content)),
                    Some(Kind::StringValue(side)),
                    Some(Kind::StringValue(topic)),
                    Some(Kind::IntegerValue(upvotes)),
                    Some(Kind::IntegerValue(downvotes)),
                ) => Some(ScoredCardDTO {
                    id,
                    content: content.clone(),
                    side: side.clone(),
                    topic: topic.clone(),
                    score,
                    link,
                    votes: upvotes - downvotes,
                }),
                (_, _, _, _, _) => None,
            }
        })
        .collect();

    Ok(cards)
}

pub async fn get_point_by_id_query(card_id: uuid::Uuid) -> Result<Option<RetrievedPoint>, actix_web::Error> {

    let qdrant = get_qdrant_connection()
        .await
        .map_err(|err| actix_web::error::ErrorBadRequest(err.message))?;

    let points = [PointId::from(card_id.to_string())];

    let mut points = qdrant.get_points("debate_cards", &points, Some(true), Some(vec![
            "content",
            "side",
            "topic",
            "user_id",
            "link",
            "upvotes",
            "downvotes",
        ]), None)
        .await
        .map_err(actix_web::error::ErrorBadRequest)?;

    Ok(points.result.pop())
}

#[derive(Serialize, Deserialize)]
pub struct RetrievedCardDTO {
    pub content: String,
    pub side: String,
    pub topic: String,
    pub votes: i64,
    pub link: Option<String>,
}

pub async fn retrieved_point_to_card_dto(
    point: RetrievedPoint,
) -> Option<RetrievedCardDTO> {

    let content = point.payload.get("content")?;
    let side = point.payload.get("side")?;
    let topic = point.payload.get("topic")?;
    let upvotes = point.payload.get("upvotes")?;
    let downvotes = point.payload.get("downvotes")?;
    let link = point.payload.get("link").and_then(|link| {
        if let Some(Kind::StringValue(s)) = &link.kind {
            Some(s.clone())
        } else {
            None
        }
    });

    match (&content.kind, &side.kind, &topic.kind, &upvotes.kind, &downvotes.kind) {
        (
            Some(Kind::StringValue(content)),
            Some(Kind::StringValue(side)),
            Some(Kind::StringValue(topic)),
            Some(Kind::IntegerValue(upvotes)),
            Some(Kind::IntegerValue(downvotes)),
        ) => Some(RetrievedCardDTO {
            content: content.clone(),
            side: side.clone(),
            topic: topic.clone(),
            link,
            votes: upvotes - downvotes,
        }),
        (_, _, _, _, _) => None
    }
}
