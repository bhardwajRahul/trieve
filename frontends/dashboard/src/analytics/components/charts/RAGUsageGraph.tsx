import { createQuery } from "@tanstack/solid-query";
import { enUS } from "date-fns/locale";
import { AnalyticsParams, RAGAnalyticsFilter } from "shared/types";
import {
  createEffect,
  createSignal,
  onCleanup,
  Show,
  useContext,
} from "solid-js";
import { getRAGUsage, getRagUsageGraph } from "../../api/analytics";
import { Chart } from "chart.js";

interface RAGUsageProps {
  params: {
    filter: RAGAnalyticsFilter;
    granularity: AnalyticsParams["granularity"];
  };
}

import "chartjs-adapter-date-fns";
import { Card } from "./Card";
import { fillDate } from "../../utils/graphDatesFiller";
import { DatasetContext } from "../../../contexts/DatasetContext";

export const RAGUsageGraph = (props: RAGUsageProps) => {
  const dataset = useContext(DatasetContext);
  const [canvasElement, setCanvasElement] = createSignal<HTMLCanvasElement>();
  let chartInstance: Chart | null = null;
  const usageQuery = createQuery(() => ({
    queryKey: [
      "rag-usage-graph",
      { params: props.params, dataset: dataset.datasetId() },
    ],
    queryFn: async () => {
      return await getRagUsageGraph(
        props.params.filter,
        props.params.granularity,
        dataset.datasetId(),
      );
    },
  }));

  const ragTotalQuery = createQuery(() => ({
    queryKey: ["rag-usage", { filter: props.params }],
    queryFn: () => {
      return getRAGUsage(dataset.datasetId(), props.params.filter);
    },
  }));

  createEffect(() => {
    const canvas = canvasElement();
    const data = usageQuery.data;

    if (!canvas || !data) return;

    if (!chartInstance) {
      // Create the chart only if it doesn't exist
      chartInstance = new Chart(canvas, {
        type: "bar",
        data: {
          labels: [],
          datasets: [
            {
              label: "Requests",
              data: [],
              backgroundColor: "rgba(128, 0, 128, 0.9)", // Light purple background
              borderWidth: 1,
              barThickness: data.length === 1 ? 40 : undefined,
            },
          ],
        },
        options: {
          responsive: true,
          plugins: {
            legend: { display: false },
          },
          aspectRatio: 3,
          scales: {
            y: {
              grid: { color: "rgba(128, 0, 128, 0.1)" }, // Light purple grid
              title: {
                text: "Requests",
                display: true,
              },
              beginAtZero: true,
            },
            x: {
              adapters: {
                date: {
                  locale: enUS,
                },
              },
              type: "time",
              time: {
                unit: "day",
              },
              title: {
                text: "Timestamp",
                display: true,
              },
              offset: false,
            },
          },
          animation: {
            duration: 0,
          },
        },
      });
    }

    if (data.length <= 1) {
      // @ts-expect-error library types not updated
      chartInstance.options.scales["x"].offset = true;
      // Set the bar thickness to 40 if there is only one data point
      // @ts-expect-error library types not updated
      chartInstance.data.datasets[0].barThickness = 40;
    } else {
      // @ts-expect-error library types not updated
      chartInstance.data.datasets[0].barThickness = undefined;
    }

    if (props.params.granularity === "day") {
      // @ts-expect-error library types not updated
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      chartInstance.options.scales["x"].time.unit = "day";
      // @ts-expect-error library types not updated
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      chartInstance.options.scales["x"].time.round = "day";
    } else if (props.params.granularity === "minute") {
      // @ts-expect-error library types not updated
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      chartInstance.options.scales["x"].time.unit = "minute";
    } else {
      // @ts-expect-error library types not updated
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      chartInstance.options.scales["x"].time.unit = undefined;
      // @ts-expect-error library types not updated
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      chartInstance.options.scales["x"].time.round = undefined;
    }

    const info = fillDate({
      data,
      date_range: props.params.filter.date_range,
      key: "requests",
    });

    // Update the chart data;
    chartInstance.data.labels = info.map((point) => point.time);
    chartInstance.data.datasets[0].data = info.map((point) => point.value);
    chartInstance.update();
  });

  onCleanup(() => {
    if (chartInstance) {
      chartInstance.destroy();
      chartInstance = null;
    }
  });

  return (
    <Card
      width={2}
      controller={
        <Show when={ragTotalQuery.data}>
          {(total) => (
            <div class="text-sm">{total().total_queries} Total Queries</div>
          )}
        </Show>
      }
      title="RAG Usage"
    >
      <canvas ref={setCanvasElement} class="h-full w-full" />
    </Card>
  );
};
