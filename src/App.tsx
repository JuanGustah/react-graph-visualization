import "./App.css";

import { HiShare } from "react-icons/hi";
import { FaSpinner } from "react-icons/fa";

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
import { Dialog } from "./components/ui/dialog";

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
import { isCpfOrCnpj } from "./helpers/isCpfOrCnpj";

import { degreeCentrality } from "graphology-metrics/centrality/degree";
import betweennessCentrality from "graphology-metrics/centrality/betweenness";
import closenessCentrality from "graphology-metrics/centrality/closeness";
import NodeModal from "./components/nodeModal/nodeModal";
import { NodeTypes } from "./models/nodeType.enum";

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

  const [isLoading, setIsLoading] = useState(false);

  const [open, setOpen] = useState(false);
  const [clickedNode, setClickedNode] = useState(null);

  useEffect(() => {
    console.log(clickedNode);
  }, [clickedNode]);

  const formSubmitHandler = (event: any) => {
    event.preventDefault();
    console.log("SUMIT");

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
              setOpen(true);
              setClickedNode(
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
      const date = formatDate(row);

      //Devido a falta de confiança na base, o index pode ser o cpf, nome ou Não Determinado(ND)
      // const cpfCnpjOD = getDestinatarioIndex(row);
      const cpfCnpjOD = row["CPF_CNPJ_OD"];

      //filtrando apenas para os casos onde os CPFs/CNPJs são reais
      if (!cpfCnpjOD || !isCpfOrCnpj(cpfCnpjOD)) {
        continue;
      }

      if (!hashIndex[cpfCnpjTitular]) {
        hashIndex[cpfCnpjTitular] = {
          names: [row["NOME_TITULAR"]],
          data: [],
          odIndex: {},
          diaryTransactionIndex: {},
        };
      }

      if (!hashIndex[cpfCnpjTitular].names.includes(row["NOME_TITULAR"])) {
        hashIndex[cpfCnpjTitular].names.push(row["NOME_TITULAR"]);
      }

      if (!hashIndex[cpfCnpjTitular].odIndex[cpfCnpjOD]) {
        hashIndex[cpfCnpjTitular].odIndex[cpfCnpjOD] = {
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
    console.log(mainNodesHash);
  }

  function generateMainGraph() {
    console.log("MAIN GRAPH");
    const mainNodes = Object.keys(mainNodesHash);

    mainNodes.forEach((mainNodeIdx) => {
      const mainNode = mainNodesHash[mainNodeIdx];

      if (!fullGraph.current.hasNode(mainNodeIdx)) {
        fullGraph.current.addNode(mainNodeIdx, {
          // label: `${mainNodeIdx} - ${mainNode.name}`,
          label: mainNodeIdx,
          color: "#15616d",
          x: 0.1,
          y: 0.1,
          size: 4,
          data: {
            nodeType: NodeTypes.ROOT,
            cpfCnpj: mainNodeIdx,
            names: mainNode.names,
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

        Object.entries(actors).forEach((transactionIndex: any) => {
          const transactionKey = transactionIndex[0];
          const transactionObject = transactionIndex[1];

          // const transactionGraphKey =
          //   transactionKey !== "ND"
          //     ? transactionKey
          //     : `${mainNodeIdx}_${transactionKey}`;
          const transactionGraphKey = transactionKey;

          // const { name, transactions } = transactionObject;
          const { transactions } = transactionObject;

          if (!fullGraph.current.hasNode(transactionGraphKey)) {
            fullGraph.current.addNode(transactionGraphKey, {
              // label: name || transactionKey,
              label: transactionKey,
              color: "#70757a",
              x: 0.1,
              y: 0.1,
              size: 3,
              data: {
                cpfCnpj: transactionKey,
                nodeType: NodeTypes.LEAF,
                transactions: transactions,
              },
            });
          } else {
            //Valida se não é um auto vetor
            if (transactionGraphKey !== mainNodeIdx) {
              fullGraph.current.updateNode(transactionGraphKey, (attr) => {
                return {
                  ...attr,
                  data: {
                    ...attr.data,
                    transactions: [...attr.data.transactions, ...transactions],
                  },
                };
              });
            }
          }

          fullGraph.current.addDirectedEdge(mainNodeIdx, transactionGraphKey, {
            color: "#adb5bd",
            weight: 1,
            type: "arrow",
          });
        });
      }

      // if (visualizationType === "transactions") {
      //   const diaryTransactions =
      //     mainNodesHash[mainNodeIdx].diaryTransactionIndex;

      //   Object.entries(diaryTransactions).forEach((transactionIndex: any) => {
      //     const date = transactionIndex[0];
      //     const transactionObject = transactionIndex[1];
      //     const transactionGraphKey = `${mainNodeIdx}${date}`;

      //     const { transactions } = transactionObject;

      //     fullGraph.current.addNode(transactionGraphKey, {
      //       label: date,
      //       color: "#70757a",
      //       x: 0.1,
      //       y: 0.1,
      //       data: { nodeType: NodeTypes.LEAF, transactions: transactions },
      //     });

      //     fullGraph.current.addEdge(mainNodeIdx, transactionGraphKey, {
      //       color: "#adb5bd",
      //       weight: 1,
      //     });
      //   });
      // }
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
      let nodeNames = [];

      let transactionsToAnalysis = transactions;
      if (selectedOperations.length > 0) {
        transactionsToAnalysis = transactions.filter((transaction: any) =>
          selectedOperations.includes(transaction["CNAB"])
        );
      }

      const hasTransactionsToAnalysis = transactionsToAnalysis.length > 0;

      if (hasTransactionsToAnalysis) {
        if (attrs.data?.nodeType == NodeTypes.ROOT) {
          nodeNames = attrs.data.names;
        } else {
          nodeNames = transactionsToAnalysis.reduce((acc, transaction) => {
            if (!acc.includes(transaction["NOME_PESSOA_OD"])) {
              return [...acc, transaction["NOME_PESSOA_OD"]];
            }
            return acc;
          }, []);
        }
      }

      let criteria = hasTransactionsToAnalysis;

      if (activateIVNFilters) {
        //byPass para sempre exibir o no de origem
        if (attrs.data?.nodeType !== NodeTypes.ROOT) {
          // if (
          //   transactionsToAnalysis[0]?.["CPF_CNPJ_OD"] &&
          //   transactionsToAnalysis[0]?.["CPF_CNPJ_OD"] !== "0"
          // ) {
          const holders: any = [];
          transactionsToAnalysis.forEach((transaction: any) => {
            if (!holders.includes(transaction["CPF_CNPJ_TITULAR"]))
              holders.push(transaction["CPF_CNPJ_TITULAR"]);
          });

          const hasManyOrEqualOriginsTransactionsThanTolerance =
            holders.length >= differentAccountsTolerance;

          criteria = criteria && hasManyOrEqualOriginsTransactionsThanTolerance;
          // } else {
          //   criteria = false;
          // }
        }
      }

      if (criteria) {
        displayGraph.current.addNode(node, {
          ...attrs,
          data: {
            ...attrs.data,
            names: nodeNames,
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
        displayGraph.current.hasNode(target) &&
        target !== source
      ) {
        displayGraph.current.addDirectedEdge(source, target, attrs);
      }
    });

    // const degrees = displayGraph.current
    //   .nodes()
    //   .map((node) => displayGraph.current.degree(node));
    // const minDegree = Math.min(...degrees);
    // const maxDegree = Math.max(...degrees);
    // const minSize = 2;
    // const maxSize = 15;

    // displayGraph.current.forEachNode((node) => {
    //   const degree = displayGraph.current.degree(node);
    //   displayGraph.current.setNodeAttribute(
    //     node,
    //     "size",
    //     minSize +
    //       ((degree - minDegree) / (maxDegree - minDegree)) * (maxSize - minSize)
    //   );
    // });

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

    const centralities = degreeCentrality(displayGraph.current);
    const betweennesses = betweennessCentrality(displayGraph.current);
    const closenesses = closenessCentrality(displayGraph.current);

    displayGraph.current.forEachNode((node, _) => {
      displayGraph.current.updateNodeAttribute(node, "data", (data) => {
        return {
          ...data,
          degreeCentrality: centralities[node],
          betweennessCentrality: betweennesses[node],
          closenessCentrality: closenesses[node],
        };
      });
    });

    console.log("END CENTRALITY");
    setIsLoading(() => {
      return false;
    });
  }

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
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
                <p className="text-sm text-zinc-600">v1.0.1</p>
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
                <h2 className="text-md text-zinc-50 font-bold ">
                  Tipologia 4n
                </h2>
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
                <Button type="submit" variant={"outline"} disabled={isLoading}>
                  {isLoading && <FaSpinner className="spinner" />}
                  Gerar
                </Button>
              </div>
            </form>
          </div>
          <div className={`canva-container ${isLoading ? "bg-zinc-800" : ""}`}>
            <div className="canva" ref={canvasRef}></div>
          </div>
        </div>

        <NodeModal node={clickedNode} />
      </Dialog>
    </>
  );
}

export default App;
