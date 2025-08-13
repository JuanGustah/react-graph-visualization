import {
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { NodeTypes } from "@/models/nodeType.enum";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from "@/components/ui/table";
import { nodeTypeModel } from "@/models/nodeTypeName.model";
import { useEffect, useState } from "react";

interface InodeModal {
  node: {
    cpfCnpj?: string;
    date?: string;
    nodeType: NodeTypes;
    names: string[];
    degreeCentrality?: number;
    betweennessCentrality?: number;
    closenessCentrality?: number;
    transactions: any[];
  };
  isModalOpen: boolean
}

export default function NodeModal({ node, isModalOpen }: InodeModal) {
  let cpfCnpj = "";
  let date = "";
  let nodeType = "";
  let names: any = [];
  let degreeCentrality = 0;
  let betweennessCentrality = 0;
  let closenessCentrality = 0;
  let transactions: any = [];

  if (node) {
    cpfCnpj = node.cpfCnpj || '';
    date =  node.date || '';
    nodeType = node.nodeType;
    names = node.names?.length ? node.names : [];
    degreeCentrality = node.degreeCentrality || 0;
    betweennessCentrality = node.betweennessCentrality || 0;
    closenessCentrality = node.closenessCentrality || 0;
    transactions = node.transactions;
  }

  const nodeTypeName = nodeType !== '' ? nodeTypeModel[nodeType] : '';
  const total = transactions.reduce((acc: any, transaction: any)=>{
    const valorTransacao = transaction['VALOR_TRANSACAO'];
    const fixedPrecisionValue = valorTransacao.replace(",",".");
    const numberValue = Number(fixedPrecisionValue) || 0;
    return acc+numberValue;
  }, 0)

  const [tableTransactions, setTableTransactions] = useState<any>([]);
  const [loadingLocations,setLoadingLocations] = useState(true);
  const [failedFetchLocations,setFailedFetchLocations] = useState(false);

  // async function callLocalizations(agencyHolderIndex: any){
  //   try{
  //     Object.entries(agencyHolderIndex).forEach(async (holderIndexEntry:any)=>{
  //       const agencyKey = holderIndexEntry[0];
  //       const {agency,bank} = holderIndexEntry[1];
  //       const response = await fetch(`https://scrapping-ic-ufrpe.onrender.com/consultar-dados?agency=${agency}&bank=${bank}`);

  //       if (!response.ok) {
  //         throw new Error(`Response status: ${response.status}`);
  //       }

  //       const result = await response.json();
  //       console.log("RES",result)
  //       agencyHolderIndex[agencyKey]['localization'] = result['1'];

  //       const address = result['endereço'] ?? '';
  //       const city = result['municipio'] ?? '';
  //       const uf = result['uf'] ?? '';

  //       const transactionsLocal = [
  //         {
  //           ...transactions[0],
  //           "LOCALIZATION": `${address}. ${city}-${uf}`
  //         },
  //         transactions.slice(1, transactions.length)
  //       ]

  //       setTableTransactions(transactionsLocal)
  //     })
  //   }catch(error){
  //     console.log("GET LOCALIZATION FAILED",error);
  //   }
  // }

  async function callAndPopulateLocalizations(){
    // callLocalizations(idx1).then(res=>{
    //   console.log("SFJHASH",idx1)
    // });
    try{
      const firstTransaction = transactions[0];

      console.log("FIRST Transaction", firstTransaction);

      const agency = firstTransaction["NUMERO_AGENCIA"];
      const bank = firstTransaction["NOME_BANCO"];

      console.log("URL",`https://scrapping-ic-ufrpe.onrender.com/consultar-dados?agency=${agency}&bank=${bank}`)

      const response = await fetch(`https://scrapping-ic-ufrpe.onrender.com/consultar-dados?agency=${agency}&bank=${bank}`);

      if (!response.ok) {
        throw new Error(`Response status: ${response.status}`);
      }

      const result = await response.json();

      console.log("RESULT",result);
      const localization = result['1'];

      const address = localization['endereço'] ?? '';
      const city = localization['municipio'] ?? '';
      const uf = localization['uf'] ?? '';

      const transactionsLocal = [
        {
          ...transactions[0],
          "LOCALIZATION": `${address}. ${city}-${uf}`
        },
        ...transactions.slice(1, transactions.length)
      ]

      setTableTransactions(transactionsLocal)
      setLoadingLocations(false);
      setFailedFetchLocations(false);

    }catch(error){
      console.log("DEU RUIM", error)
      setLoadingLocations(false);
      setFailedFetchLocations(true);
    }
  }

  useEffect(()=>{
    if(isModalOpen){
      //indexing only for search localization
      // const agencyHolderIndex: any = {}
      // const agencyOdIndex: any = {}

      setTableTransactions(transactions);
      setLoadingLocations(true);
      setFailedFetchLocations(false);

      // transactions.forEach(transaction =>{
      //   if(!agencyHolderIndex[transaction['NUMERO_AGENCIA']]){
      //     agencyHolderIndex[transaction['NUMERO_AGENCIA']] = {
      //       agency: transaction['NUMERO_AGENCIA'],
      //       account: transaction['NUMERO_CONTA'],
      //       bank: transaction['NOME_BANCO'],
      //     }
      //   }

      //   if(!!transaction['NUMERO_AGENCIA_OD'] && transaction['NUMERO_AGENCIA_OD'] != '0' && !agencyHolderIndex[transaction['NUMERO_AGENCIA_OD']]){
      //     agencyOdIndex[transaction['NUMERO_AGENCIA_OD']] = {
      //       agency: transaction['NUMERO_AGENCIA_OD'],
      //       account: transaction['NUMERO_CONTA_OD'],
      //       bank: '',
      //     }
      //   }
      // })

      // const callAndPopulateLocalizations = async(idx1:any) => {
      //   //fazer chamada a api com indices
      //   const res = await callLocalizations(idx1);
      //   console.log("SFJHASH",agencyHolderIndex)

      //   // const newTransactions = transactions.map(transaction =>{
      //   //   if(agencyHolderIndex[transaction['NUMERO_AGENCIA']]){
      //   //     console.log("adsad", agencyHolderIndex[transaction['NUMERO_AGENCIA']])

      //   //     const localization = agencyHolderIndex[transaction['NUMERO_AGENCIA']]['localization'];
      //   //     // const address = localization['endereço'] ?? '';
      //   //     // const city = localization['municipio'] ?? '';
      //   //     // const uf = localization['uf'] ?? '';
      //   //     // return {
      //   //     //   ...transaction,
      //   //     //   'HOLDER_LOCALIZATION': `${address}. ${city}-${uf}`
      //   //     // }
      //   //   }

      //   //   return transaction;
      //   // })

      //   // setTableTransactions(newTransactions);
      // }

      callAndPopulateLocalizations();
    }
  },[isModalOpen])

  return (
    <DialogContent className="bg-zinc-900 text-zinc-50 border-zinc-600 min-w-1/2 ">
      <DialogHeader>
        <DialogTitle>Nó {nodeTypeName}</DialogTitle>
      </DialogHeader>
      <header className="flex flex-col gap-1">
        <h3 className="text-md font-bold mb-1">Informações</h3>
        { nodeType !== NodeTypes.DIARY_TRANSACTIONS && 
        (
          <>
          <p>Cpf/Cnpj: {cpfCnpj}</p>
          <p>
            Nomes do {nodeTypeName}: {names.join(", ")}
          </p>
          </>
        )}

        { nodeType === NodeTypes.DIARY_TRANSACTIONS && 
        (
          <p>Transação do dia: {date}</p>
        )}
        <div>
          <p>Degree Centrality: {degreeCentrality?.toFixed(4)}</p>
          <p>Betweness Centrality: {betweennessCentrality?.toFixed(4)}</p>
          <p>Closeness Centrality: {closenessCentrality?.toFixed(4)}</p>
        </div>
      </header>
      <div className="h-64 overflow-auto">
        <h3 className="text-md font-bold mb-3">Transações</h3>
        <div>
          <Table classNameTableContainer="h-24">
            <TableHeader>
              <TableRow>
                <TableHead className="text-zinc-50">Cpf/Cnpj Titular</TableHead>
                <TableHead className="text-zinc-50">Nº Conta Titular</TableHead>
                <TableHead className="text-zinc-50">Agência Titular</TableHead>
                <TableHead className="text-zinc-50">Banco Titular</TableHead>
                <TableHead className="text-zinc-50">Localização Banco Titular</TableHead>
                <TableHead className="text-zinc-50">Cpf/Cnpj OD</TableHead>
                <TableHead className="text-zinc-50">Nome OD</TableHead>
                <TableHead className="text-zinc-50">Nº Conta OD</TableHead>
                <TableHead className="text-zinc-50">Agência OD</TableHead>
                <TableHead className="text-zinc-50">Banco OD</TableHead>
                <TableHead className="text-zinc-50">Valor Transação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tableTransactions.map((transaction:any, index: number) => (
                <TableRow key={index}>
                  <TableCell>{transaction["CPF_CNPJ_TITULAR"]}</TableCell>
                  <TableCell>{transaction["NUMERO_CONTA"]}</TableCell>
                  <TableCell>{transaction["NUMERO_AGENCIA"]}</TableCell>
                  <TableCell>{transaction["NOME_BANCO"]}</TableCell>
                  <TableCell>{ loadingLocations ? 'Carregando...' : failedFetchLocations ? 'Não encontrado.' : transaction?.["LOCALIZATION"] ?? ''}</TableCell>
                  <TableCell>{transaction["CPF_CNPJ_OD"]}</TableCell>
                  <TableCell>{transaction["NOME_PESSOA_OD"]}</TableCell>
                  <TableCell>{transaction["NUMERO_CONTA_OD"]}</TableCell>
                  <TableCell>{transaction["NUMERO_AGENCIA_OD"]}</TableCell>
                  <TableCell> </TableCell>
                  <TableCell>{transaction["VALOR_TRANSACAO"]}</TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell colSpan={10}>Total</TableCell>
                <TableCell>{total}</TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </div>
      </div>
    </DialogContent>
  );
}
