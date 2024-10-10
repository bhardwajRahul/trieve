import { createQuery, useQueryClient } from "@tanstack/solid-query";
import { getRecommendationQueries } from "../../api/tables";
import { createEffect, createSignal, useContext } from "solid-js";
import { createStore } from "solid-js/store";
import { subDays } from "date-fns";
import { usePagination } from "../usePagination";
import { RecommendationsAnalyticsFilter } from "shared/types";
import { DatasetContext } from "../../../contexts/DatasetContext";
import { sortByCols } from "./useDataExplorerSearch";

export const useDataExplorerRecommendations = () => {
  const queryClient = useQueryClient();
  const [filters, setFilters] = createStore<RecommendationsAnalyticsFilter>({
    date_range: {
      gt: subDays(new Date(), 7),
    },
    recommendation_type: undefined,
  });

  const [sortOrder, setSortOrder] = createSignal<"desc" | "asc">("desc");

  const [sortBy, setSortBy] = createSignal<sortByCols>("created_at");

  const pages = usePagination();

  const dataset = useContext(DatasetContext);

  // Get query data for next page
  createEffect(() => {
    void queryClient.prefetchQuery({
      queryKey: [
        "recommendations-query-table",
        {
          filter: filters,
          page: pages.page() + 1,
          sortBy: sortBy(),
          sortOrder: sortOrder(),
          datasetId: dataset.datasetId(),
        },
      ],
      queryFn: async () => {
        const results = await getRecommendationQueries(
          {
            filter: filters,
            page: pages.page() + 1,
            sortBy: sortBy(),
            sortOrder: sortOrder(),
          },
          dataset.datasetId(),
        );
        if (results.length === 0) {
          pages.setMaxPageDiscovered(pages.page());
        }
        return results;
      },
    });
  });

  const recommendationTableQuery = createQuery(() => ({
    queryKey: [
      "recommendations-query-table",
      {
        filter: filters,
        page: pages.page(),
        sortBy: sortBy(),
        sortOrder: sortOrder(),
        datasetId: dataset.datasetId(),
      },
    ],

    queryFn: () => {
      return getRecommendationQueries(
        {
          filter: filters,
          page: pages.page(),
          sortBy: sortBy(),
          sortOrder: sortOrder(),
        },
        dataset.datasetId(),
      );
    },
  }));

  return {
    pages,
    recommendationTableQuery,
    sortBy,
    setSortBy,
    filters,
    setFilters,
    sortOrder,
    setSortOrder,
  };
};
