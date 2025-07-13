import "./App.css";

import { HiShare } from "react-icons/hi";

import { Input } from "./components/ui/input";
import { Button } from "./components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

import Papa from "papaparse";
import Graph from "graphology";
import Sigma from "sigma";
import { useEffect, useRef, useState } from "react";
import forceAtlas2 from "graphology-layout-forceatlas2";
import random from "graphology-layout/random";
import circular from "graphology-layout/circular";
import ReactSelect from "react-select";
import FA2Layout from "graphology-layout-forceatlas2/worker";

import noverlap from "graphology-layout-noverlap";
import { MultiSelect } from "./components/ui/multi-select";

function App() {
  let moneyData: any = [];
  // const mainNodesHash: any = {};
  const [mainNodesHash, setMainNodesHash] = useState<any>({});
  const canvasRef = useRef(null);

  const [visualizationType, setVisualizationType] = useState("");
  //201 - deposito online / generico
  //205 - deposito dinheiro loterica
  //214 - depositos especiais
  //220 - deposito dinheiro terminal
  const IVNOperations = ["201", "205", "214", "220"];
  const allOperations: any = [
    { value: "201", label: "201 - Deposito" },
    { value: "205", label: "205 - Deposito em dinheiro em loterica" },
    { value: "214", label: "214 - Depositos especiais" },
    { value: "220", label: "220 - Deposito em dinheiro em terminais" },
  ];
  const [selectedOperations, setSelectedOperations] = useState<string[]>([]);
  const [activateIVNFilters, setActiveIVNFilters] = useState(false);
  const [differentAccountsTolerance, setDifferentAccountsTolerance] =
    useState(1);

  const fullGraph = useRef(new Graph());
  const displayGraph = useRef(new Graph());

  enum NodeTypes {
    ROOT = "MAIN_NODE",
    LEAF = "LEAF",
  }

  useEffect(() => {
    console.log(mainNodesHash);
  }, [selectedOperations]);

  const formSubmitHandler = (event: any) => {
    event.preventDefault();

    if (Object.entries(mainNodesHash).length === 0) {
      Papa.parse(event.target[0].files[0], {
        header: true,
        delimiter: ";",
        complete: function (results: any) {
          try {
            moneyData = results.data;
            indexMainNodes(moneyData);
            generateMainGraph();
            const renderer = new Sigma(displayGraph.current, canvasRef.current);
            renderer.on("clickNode", (node) => {
              console.log("NODE", node);
              console.log(
                "NODEINFO",
                displayGraph.current.getNodeAttribute(node.node, "data")
              );
            });
            generateViewGraph();
          } catch (error) {
            console.log(error);
          }
        },
      });
    } else {
      generateViewGraph();
    }

    // generateGraph();
  };

  function getDestinatarioIndex(row: any) {
    if (row["CPF_CNPJ_OD"] && row["CPF_CNPJ_OD"] !== "0") {
      return row["CPF_CNPJ_OD"];
    }

    if (row["NOME_PESSOA_OD"]) {
      return row["NOME_PESSOA_OD"].replace(" ", "_");
    }

    if (isCpfOrCnpj(String(row["NUMERO_DOCUMENTO"]))) {
      return String(row["NUMERO_DOCUMENTO"]);
    }

    return "ND";
  }

  function getCpfCnpjDestin(row: any) {
    if (row["CPF_CNPJ_OD"]) {
      if (row["CPF_CNPJ_OD"] !== "0") {
        return row["CPF_CNPJ_OD"];
      }

      if (isCpfOrCnpj(row["NUMERO_DOCUMENTO"])) {
        return row["NUMERO_DOCUMENTO"];
      }
    }
    return undefined;
  }

  function isCpfOrCnpj(document: string) {
    return document.length === 14 || document.length === 11;
  }

  function formatDate(row: any) {
    const day = row["DIA_LANCAMENTO"].padStart(2, "0");
    const month = row["MES_LANCAMENTO"].padStart(2, "0");
    const year = row["ANO_LANCAMENTO"];
    return `${day}/${month}/${year}`;
  }

  function indexMainNodes(moneyData: any) {
    const hashIndex = mainNodesHash;

    for (let index = 0; index < moneyData.length; index++) {
      const row = moneyData[index];

      const cpfCnpjTitular = row["CPF_CNPJ_TITULAR"];
      const cpfCnpjOD = getDestinatarioIndex(row);
      const date = formatDate(row);

      if (!hashIndex[cpfCnpjTitular]) {
        hashIndex[cpfCnpjTitular] = {
          name: row["NOME_TITULAR"],
          data: [],
          odIndex: {},
          diaryTransactionIndex: {},
        };
      }

      if (!hashIndex[cpfCnpjTitular].odIndex[cpfCnpjOD]) {
        hashIndex[cpfCnpjTitular].odIndex[cpfCnpjOD] = {
          name: row["NOME_PESSOA_OD"],
          document: getCpfCnpjDestin(row),
          transactions: [],
        };
      }

      if (!hashIndex[cpfCnpjTitular].diaryTransactionIndex[date]) {
        hashIndex[cpfCnpjTitular].diaryTransactionIndex[date] = {
          transactions: [],
        };
      }

      hashIndex[cpfCnpjTitular].data.push(row);
      hashIndex[cpfCnpjTitular].odIndex[cpfCnpjOD].transactions.push(row);
      hashIndex[cpfCnpjTitular].diaryTransactionIndex[date].transactions.push(
        row
      );
    }

    setMainNodesHash(hashIndex);
    // console.log(mainNodesHash);
  }

  function generateMainGraph() {
    console.log("MAIN GRAPH");
    const mainNodes = Object.keys(mainNodesHash);

    mainNodes.forEach((mainNodeIdx) => {
      const mainNode = mainNodesHash[mainNodeIdx];

      if (!fullGraph.current.hasNode(mainNodeIdx)) {
        fullGraph.current.addNode(mainNodeIdx, {
          label: `${mainNodeIdx} - ${mainNode.name}`,
          color: "#15616d",
          x: 0.1,
          y: 0.1,
          data: {
            nodeType: NodeTypes.ROOT,
            cpfCnpj: mainNodeIdx,
            name: mainNode.name,
            transactions: mainNode.data,
          },
        });
      } else {
        fullGraph.current.updateNode(mainNodeIdx, (attr) => {
          return {
            ...attr,
            color: "#15616d",
            nodeType: NodeTypes.ROOT,
            data: {
              ...attr.data,
              cpfCnpj: mainNodeIdx,
              transactions: [...attr.data.transactions, ...mainNode.data],
            },
          };
        });
      }

      if (visualizationType === "actors") {
        const actors = mainNodesHash[mainNodeIdx].odIndex;

        Object.entries(actors).forEach(
          (transactionIndex: any, index: number) => {
            const transactionKey = transactionIndex[0];
            const transactionObject = transactionIndex[1];

            const transactionGraphKey =
              transactionKey !== "ND"
                ? transactionKey
                : `${mainNodeIdx}_${transactionKey}`;

            const { name, transactions: destTransactions } = transactionObject;

            if (!fullGraph.current.hasNode(transactionGraphKey)) {
              fullGraph.current.addNode(transactionGraphKey, {
                label: name || transactionKey,
                color: "#70757a",
                x: 0.1,
                y: 0.1,
                data: {
                  nodeType: NodeTypes.LEAF,
                  transactions: destTransactions,
                },
              });
            } else {
              if (transactionGraphKey !== mainNodeIdx) {
                fullGraph.current.updateNode(transactionGraphKey, (attr) => {
                  return {
                    ...attr,
                    data: {
                      ...attr.data,
                      transactions: [
                        ...attr.data.transactions,
                        ...destTransactions,
                      ],
                    },
                  };
                });
              }
            }

            fullGraph.current.addEdge(mainNodeIdx, transactionGraphKey, {
              color: "#adb5bd",
              weight: 1,
            });
          }
        );
      }

      if (visualizationType === "transactions") {
        const diaryTransactions =
          mainNodesHash[mainNodeIdx].diaryTransactionIndex;

        Object.entries(diaryTransactions).forEach((transactionIndex: any) => {
          const date = transactionIndex[0];
          const transactionObject = transactionIndex[1];
          const transactionGraphKey = `${mainNodeIdx}${date}`;

          const { transactions } = transactionObject;

          fullGraph.current.addNode(transactionGraphKey, {
            label: date,
            color: "#70757a",
            x: 0.1,
            y: 0.1,
            data: { nodeType: NodeTypes.LEAF, transactions: transactions },
          });

          fullGraph.current.addEdge(mainNodeIdx, transactionGraphKey, {
            color: "#adb5bd",
            weight: 1,
          });
        });
      }
    });

    console.log("END MAIN GRAPH");
  }

  function generateViewGraph() {
    displayGraph.current.clear();

    console.log("START VIEW GRAPH");
    fullGraph.current.forEachNode((node, attrs) => {
      // if (attrs.data.type === NodeTypes.ROOT)
      //   return displayGraph.current.addNode(node, attrs);

      const transactions = attrs.data.transactions;
      let transactionsToAnalysis = transactions;
      if (selectedOperations.length > 0) {
        transactionsToAnalysis = transactions.filter((transaction: any) =>
          selectedOperations.includes(transaction["CNAB"])
        );
      }
      const hasTransactionsToAnalysis = transactionsToAnalysis.length > 0;

      let criteria = hasTransactionsToAnalysis;

      if (activateIVNFilters) {
        //byPass para sempre exibir o no de origem
        if (attrs.data?.nodeType !== NodeTypes.ROOT) {
          if (
            transactionsToAnalysis[0]?.["CPF_CNPJ_OD"] &&
            transactionsToAnalysis[0]?.["CPF_CNPJ_OD"] !== "0"
          ) {
            const holders: any = [];
            transactionsToAnalysis.forEach((transaction: any) => {
              if (!holders.includes(transaction["CPF_CNPJ_TITULAR"]))
                holders.push(transaction["CPF_CNPJ_TITULAR"]);
            });

            const hasManyOrEqualOriginsTransactionsThanTolerance =
              holders.length >= differentAccountsTolerance;

            criteria =
              criteria && hasManyOrEqualOriginsTransactionsThanTolerance;
          } else {
            criteria = false;
          }
        }
      }

      if (criteria) {
        displayGraph.current.addNode(node, {
          ...attrs,
          data: {
            ...attrs.data,
            transactions: transactionsToAnalysis,
          },
        });
      }

      // const isLeafNode = attrs.data.type === NodeTypes.LEAF;
      // const isRootNode =
      // const isOperationPermitted = selectedOperations.includes(attrs.data?.cnab);
      // const criteria = isRootNode || (isLeafNode && isOperationPermitted);
      // if(criteria){
      //   displayGraph.addNode(node, attrs);
      // }
    });

    fullGraph.current.forEachEdge((edge, attrs, source, target) => {
      if (
        displayGraph.current.hasNode(source) &&
        displayGraph.current.hasNode(target)
      ) {
        displayGraph.current.addEdge(source, target, attrs);
      }
    });

    const degrees = displayGraph.current
      .nodes()
      .map((node) => displayGraph.current.degree(node));
    const minDegree = Math.min(...degrees);
    const maxDegree = Math.max(...degrees);
    const minSize = 2;
    const maxSize = 15;

    displayGraph.current.forEachNode((node) => {
      const degree = displayGraph.current.degree(node);
      displayGraph.current.setNodeAttribute(
        node,
        "size",
        minSize +
          ((degree - minDegree) / (maxDegree - minDegree)) * (maxSize - minSize)
      );
    });

    console.log("FINALIZOU A CONSTRUÇÃO INTERNA");

    circular.assign(displayGraph.current, {
      scale: 1,
    });
    console.log("FINALIZOU A CONSTRUÇÃO CIRCULAR");

    const settings = forceAtlas2.inferSettings(displayGraph.current);
    forceAtlas2.assign(displayGraph.current, {
      settings,
      iterations: 100,
    });
    console.log("END VIEW GRAPH");
  }

  // function generateGraph() {
  //   const graph = new Graph();

  //   const mainNodes = Object.keys(mainNodesHash);
  //   const permittedOperations = selectedOperations;

  //   mainNodes.forEach((mainNodeIdx) => {
  //     const mainNode = mainNodesHash[mainNodeIdx];
  //     // const transactions = mainNode.data.filter((operation) =>
  //     //   permittedOperations.includes(operation["CNAB"])
  //     // );

  //     graph.addNode(mainNodeIdx, {
  //       label: `${mainNodeIdx} - ${mainNode.name}`,
  //       color: "#15616d",
  //       x: 0.1,
  //       y: 0.1,
  //       data: { cpfCnpj: mainNodeIdx, name: mainNode.name },
  //     });

  //     if (visualizationType === "actors") {
  //       const actors = mainNodesHash[mainNodeIdx].destinatarioIndex;

  //       Object.entries(actors).forEach(
  //         (transactionIndex: any, index: number) => {
  //           const transactionGraphKey = `${mainNodeIdx}${index}`;
  //           const transactionKey = transactionIndex[0];
  //           const transactionObject = transactionIndex[1];
  //           const { name, transactions: destTransactions } = transactionObject;
  //           // destTransactions = destTransactions.filter((operation) =>
  //           //   permittedOperations.includes(operation["CNAB"])
  //           // );

  //           if (destTransactions.length > 0) {
  //             graph.addNode(transactionGraphKey, {
  //               label: name || transactionKey,
  //               color: "#70757a",
  //               x: 0.1,
  //               y: 0.1,
  //               data: { transactions: destTransactions },
  //             });

  //             graph.addEdge(mainNodeIdx, transactionGraphKey, {
  //               color: "#adb5bd",
  //               weight: 1,
  //             });
  //           }
  //         }
  //       );
  //     }

  //     if (visualizationType === "transactions") {
  //       const diaryTransactions =
  //         mainNodesHash[mainNodeIdx].diaryTransactionIndex;

  //       Object.entries(diaryTransactions).forEach((transactionIndex: any) => {
  //         const date = transactionIndex[0];
  //         const transactionObject = transactionIndex[1];
  //         const transactionGraphKey = `${mainNodeIdx}${date}`;

  //         let { transactions } = transactionObject;
  //         transactions = transactions.filter((operation) =>
  //           permittedOperations.includes(operation["CNAB"])
  //         );

  //         if (transactions.length > 0) {
  //           graph.addNode(transactionGraphKey, {
  //             label: date,
  //             color: "#70757a",
  //             x: 0.1,
  //             y: 0.1,
  //             data: { transactions: transactions },
  //           });

  //           graph.addEdge(mainNodeIdx, transactionGraphKey, {
  //             color: "#adb5bd",
  //             weight: 1,
  //           });
  //         }
  //       });
  //     }
  //   });

  //   const degrees = graph.nodes().map((node) => graph.degree(node));
  //   const minDegree = Math.min(...degrees);
  //   const maxDegree = Math.max(...degrees);
  //   const minSize = 2;
  //   const maxSize = 15;

  //   graph.forEachNode((node) => {
  //     const degree = graph.degree(node);
  //     graph.setNodeAttribute(
  //       node,
  //       "size",
  //       minSize +
  //         ((degree - minDegree) / (maxDegree - minDegree)) * (maxSize - minSize)
  //     );
  //   });

  //   // graph.addNode("1", {
  //   //   label: "Node 1",
  //   //   x: 0.1,
  //   //   y: 0.1,
  //   //   size: 10,
  //   //   color: "red",
  //   // });
  //   // graph.addNode("2", {
  //   //   label: "Node 2",
  //   //   x: 0.2,
  //   //   y: 0.2,
  //   //   size: 10,
  //   //   color: "red",
  //   // });
  //   // graph.addNode("3", {
  //   //   label: "Node 3",
  //   //   x: 0.3,
  //   //   y: 0.3,
  //   //   size: 10,
  //   //   color: "red",
  //   // });
  //   // graph.addEdge("1", "2", { size: 5, color: "purple" });
  //   console.log("FINALIZOU A CONSTRUÇÃO INTERNA");
  //   // random.assign(graph, {
  //   //   scale: 20,
  //   // });

  //   // forceAtlas2.assign(graph, {
  //   //   iterations: 10,
  //   //   settings: {
  //   //     gravity: 1,
  //   //   },
  //   // });

  //   // const layout = new FA2Layout(graph, {
  //   //   settings: {
  //   //     gravity: 1.5,
  //   //     scalingRatio: 20,
  //   //     barnesHutOptimize: true,
  //   //     barnesHutTheta: 0.3,
  //   //     strongGravityMode: true,
  //   //     edgeWeightInfluence: 0.2,
  //   //   },
  //   // });

  //   // layout.start();

  //   // setTimeout(() => {
  //   //   layout.stop();
  //   //   console.log("FORCE2 finalizado");

  //   //   noverlap.assign(graph, {
  //   //     maxIterations: 50,
  //   //     settings: {
  //   //       ratio: 2,
  //   //     },
  //   //   });
  //   //   console.log("Layout finalizado");
  //   // }, 50000);

  //   circular.assign(graph, {
  //     scale: 1,
  //   });
  //   console.log("FINALIZOU A CONSTRUÇÃO CIRCULAR");

  //   const settings = forceAtlas2.inferSettings(graph);
  //   console.log("SETTT", settings);
  //   forceAtlas2.assign(graph, {
  //     settings,
  //     iterations: 100,
  //   });
  //   console.log("FINALIZOU A CONSTRUÇÃO ATLAS");

  //   // graph.forEachNode((node, attrs) => {
  //   //   console.log(`Nó: ${node}, x: ${attrs.x}, y: ${attrs.y}`);
  //   // });

  //   // noverlap.assign(graph, {
  //   //   maxIterations: 20,
  //   //   settings: {
  //   //     ratio: 2,
  //   //   },
  //   // });
  //   // console.log("Layout finalizado");

  //   const renderer = new Sigma(graph, canvasRef.current);
  //   renderer.on("clickNode", (node) => {
  //     console.log("NODE", node);
  //     console.log("NODEINFO", graph.getNodeAttribute(node.node, "data"));
  //   });
  //   console.log("FINALIZOU A CONSTRUÇÃO EXTERNA");
  // }

  return (
    <>
      <div className="app">
        <div className="menu bg-zinc-900">
          <header className="flex items-center gap-4 mt-3 border-b-1 border-zinc-600 pb-3">
            <div className="flex items-center justify-center rounded-xl bg-zinc-800 p-3">
              <HiShare className="text-zinc-50" />
            </div>
            <div className="flex flex-col">
              <h1 className="text-md text-zinc-50 font-bold">
                Experimental Graph
              </h1>
              <p className="text-sm text-zinc-600">v1.0.0</p>
            </div>
          </header>
          <form onSubmit={formSubmitHandler}>
            <header className="flex flex-col gap-1">
              <h2 className="text-md text-zinc-50 font-bold">
                Dados de entrada
              </h2>
              {/* <input
                type="file"
                name="file"
                accept=".csv"
                style={{ display: "block", margin: "10px auto" }}
                id="x"
              /> */}
              <Input
                type="file"
                name="file"
                accept=".csv"
                className="text-zinc-50 bg-zinc-800 border-zinc-600 file:text-neutral-500"
              />
            </header>

            <h2 className="text-md text-zinc-50 font-bold">
              Definições do Grafo
            </h2>
            <div className="form-group flex flex-col gap-1 mt-3">
              <label htmlFor="operations" className="text-sm text-zinc-400">
                Analisar por
              </label>
              <Select
                value={visualizationType}
                onValueChange={(e) => {
                  setVisualizationType(e);
                }}
              >
                <SelectTrigger className="w-full text-zinc-50 bg-zinc-800 border-zinc-600">
                  <SelectValue placeholder="Selecionar" className="0" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="actors">Atores</SelectItem>
                  <SelectItem value="transactions" disabled={true}>
                    Transações
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="form-group flex flex-col gap-1 mt-3">
              <label htmlFor="operations" className="text-sm text-zinc-400">
                Filtrar operações
              </label>
              {/* Trocar o select */}
              {/* Por esse aqui https://shadcn-multi-select-component.vercel.app/*/}
              {/* <ReactSelect
                name="operations"
                id="operations"
                options={allOperations}
                isMulti
                defaultValue={[
                  ...allOperations.filter((operation) =>
                    IVNOperations.includes(operation.value)
                  ),
                ]}
                onChange={(selectedOperations: any) => {
                  setSelectedOperations(selectedOperations);
                }}
              /> */}
              <MultiSelect
                options={allOperations}
                defaultValue={selectedOperations}
                onValueChange={setSelectedOperations}
                placeholder="Selecionar Operações"
                maxCount={2}
                className="text-zinc-50 bg-zinc-800 border-zinc-600"
              />
            </div>

            <div className="flex justify-between items-center mt-5">
              <h2 className="text-md text-zinc-50 font-bold ">Tipologia 4n</h2>
              <Checkbox
                checked={activateIVNFilters}
                onCheckedChange={() => {
                  setActiveIVNFilters(!activateIVNFilters);
                }}
              />
            </div>
            <div className="form-group flex flex-col gap-1 mt-3">
              <label htmlFor="tolerance" className="text-sm text-zinc-400">
                Tolerância de contas diferentes
              </label>
              <Input
                type="number"
                id="tolerance"
                name="tolerance"
                value={differentAccountsTolerance}
                onChange={(e) => {
                  setDifferentAccountsTolerance(Number(e.target.value));
                }}
                disabled={!activateIVNFilters}
                className="text-zinc-50 bg-zinc-800 border-zinc-600"
              />
            </div>
            <div className="button-row">
              <Button type="submit" variant={"outline"}>
                Gerar
              </Button>
            </div>
          </form>
        </div>
        <div className="canva" ref={canvasRef}></div>
      </div>
    </>
  );
}

export default App;
