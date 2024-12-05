import React from 'react';
import PropTypes from 'prop-types';
import makeStyles from '@mui/styles/makeStyles';
import LinkOut from './link-out';
import { Typography } from '@mui/material';


const faqs = [
  [
    {
      question: <>What is iRegulon?</>,
      answer: <>
        iRegulon is a bioinformatics tool that predicts the master regulators and their target genes within a set of co-expressed genes.
        It uses a comprehensive collection of transcription factor binding site motifs and ChIP-Seq data to identify enriched regulatory 
        elements and infers potential regulatory networks.
      </>,
    },
    {
      question: <>How does iRegulon work?</>,
      answer: <>
        iRegulon employs a &quot;ranking-and-recovery&quot; approach.<br />
        <UnorderedList
          items={[
            <>
              <b>Ranking:</b> Each gene in the human genome &#40;and orthologous genes in other vertebrate genomes&#41; is ranked based 
              on the presence and strength of potential transcription factor binding sites &#40;TFBS&#41; in its regulatory regions. 
              This creates a ranked list for each TFBS motif.
            </>
          ,
            <>
              <b>Recovery:</b> A user-provided set of co-expressed genes is then analyzed for enrichment in each of the ranked lists. 
              Motifs showing significant enrichment suggest potential regulators of the input gene set.
            </>
          ]}
        />
        iRegulon also uses a &quot;motif2TF&quot; approach to link enriched motifs to specific transcription factors.
        This database leverages direct motif annotations, TF homology, and motif similarity to provide candidate TFs for a given enriched motif.
      </>,
    },
    {
      question: <>What are the supported organisms?</>,
      answer: <>
        Human, mouse and drosophila.
      </>,
    },
    {
      question: <>What are the supported gene IDs?</>,
      answer: <>
        <UnorderedList
          items={[
            <><LinkOut href="https://www.genenames.org/tools/multi-symbol-checker/">HGNC symbols</LinkOut> for human</>,
            <><LinkOut href="https://www.informatics.jax.org/mgihome/nomen/">MGI symbols</LinkOut> for mouse</>,
            <>CG numbers and <LinkOut href="https://wiki.flybase.org/wiki/FlyBase:Nomenclature">Flybase names</LinkOut> for drosophila</>,
          ]}
        />
      </>,
    },
    {
      question: <>What types of gene sets can I use with iRegulon?</>,
      answer: <>
        iRegulon can be applied to various gene sets, including:
        <UnorderedList
          items={[
            <>Co-expressed genes from gene expression profiling experiments</>,
            <>Genes involved in specific pathways &#40;e.g., KEGG, Reactome, Gene Ontology&#41;</>,
            <>Genes connected in biological networks &#40;e.g., GeneMania, STRING&#41;</>,
            <>Shared targets of microRNAs</>,
          ]}
        />
      </>,
    },
    {
      question: <>How does iRegulon handle noisy gene sets?</>,
      answer: <>
        iRegulon is designed to be robust to noisy gene sets, meaning it can still identify relevant regulators
        even if the input set contains genes that are not directly regulated by the same TF.
        It achieves this by focusing on the most highly ranked genes for each motif and using statistical methods 
        to assess enrichment.
      </>,
    },
    {
      question: <>Can iRegulon predict direct and indirect targets?</>,
      answer: <>
        Yes, iRegulon can distinguish between direct and indirect targets within a co-expressed gene set. 
        It does this by identifying the &quot;leading edge&quot; of target genes, which are those genes most highly ranked 
        for a given motif and significantly above the background ranking. 
        Genes beyond the leading edge are considered potential indirect targets.
      </>,
    },
    {
      question: <>How can I validate the predictions made by iRegulon?</>,
      answer: <>
        iRegulon predictions can be validated using several approaches:
        <UnorderedList
          items={[
            <>
              <b>Comparison with ChIP-Seq data:</b> If available, ChIP-Seq data for the predicted regulator can be used 
              to confirm the binding of the TF to the predicted target genes.
            </>,
            <>
              <b>Experimental validation:</b> Techniques such as luciferase reporter assays can be used to test the regulatory activity 
              of predicted enhancer regions containing the enriched motifs.
            </>,
            <>
              <b>Meta-analysis:</b> iRegulon can be applied to multiple gene signatures to identify recurrently predicted targets, 
              providing further evidence for the regulatory interactions.
            </>,
          ]}
        />
      </>,
    },
    {
      question: <>What are the advantages of using iRegulon compared to other motif discovery tools?</>,
      answer: <>
        iRegulon offers several advantages over other motif discovery tools:
        <UnorderedList
          items={[
            <>
              <b>Large motif collection:</b> It utilizes a vast collection of over 9,000 TFBS motifs from multiple species, 
              increasing the chances of finding the correct regulator.
            </>,
            <>
              <b>Motif2TF mapping:</b> This unique feature links enriched motifs to specific transcription factors, 
              even if the motif itself is not annotated for a human TF.
            </>,
            <>
              <b>Integration with Cytoscape:</b> iRegulon is also available as a user-friendly <LinkOut href="https://apps.cytoscape.org/apps/iregulon">Cytoscape plugin</LinkOut>, 
              allowing seamless integration of predicted regulatory networks with other biological networks and data analysis tools.
            </>,
          ]}
        />
      </>,
    },
  ], [
    {
      question: <>How long does the iRegulon query take?</>,
      answer: <>
        On average, it takes about 2 minutes to create a network from a list of genes.
      </>,
    },
    {
      question: <>How can the same transcription factor be detected in two different clusters?</>,
      answer: <>
        The Transcription Factor view relies on the motif clustering which is performed only on the enriched motifs using STAMP. 
        So a TF can be assigned to a cluster of motifs that are similar, but if such TF is annotated for a motif 
        which varies enough to be clustered with other motifs, then you can find the same TF associated to another cluster 
        because of a different motif.
      </>,
    },
    {
      question: <>The transcription factor or motif I&apos;m looking for has a low ranking, but has clustercode 1. Is this a good result?</>,
      answer: <>
        This depends of your research. A low ranking doesn&apos;t give a bad result. Like here the clustercode is 1, 
        so the motif of this transcription factor is clustered in the same cluster as the top motif. 
        This means that the motifs has a lot in common, and that is a good result.
      </>,
    },
    {
      question: <>A motif can be associated to different transcription factors, which one has the highest rank?</>,
      answer: <>
        The TFs are ordered by the motif2TF algorithm by decreasing order of preference. 
        The best transcription factors are those that are directly annotated &#40;&quot;Direct&quot;&#41; and a preference will be 
        for the TF that are from the input. 
        Then, the motif2TF algorithm will give preference to the TF associated by orthology, 
        then the TF associated by motif similarity.
      </>,
    },
    {
      question: <>A transcription factor has orthologous and the motif below that &#40;same cluster&#41; has a perfect match, is the second transcription factor better?</>,
      answer: <>
        The NES score of the motif decides the rank. Transcription factors are ranked for each motif. 
        So the motifs are ranked and not the transcription factors. 
        It is very difficult to decide if the second transcription factor is better or not. 
        But it&apos;s certain that the highest motif is better than the second.
      </>,
    },
    {
      question: <>How do I save my network?</>,
      answer: <>
        Accounts are not supported right now. In order to save your results, you have the following options:
        <UnorderedList
          items={[
            <>Create a <LinkOut href="https://www.pcmag.com/how-to/how-to-organize-sync-web-browser-bookmarks-chrome-edge-firefox">bookmark</LinkOut> using your web browser.</>,
            <>Copy the URL in the browser address bar and save it.</>,
            <>Download the network images and data&mdash;the <code>README</code> file contains the permanent link to the network.</>,
            <>If you use the same browser, the home page shows the last 20 networks you opened.</>,
          ]}
        />
      </>,
    },
    {
      question: <>How do I share my network?</>,
      answer: <>
        <UnorderedList
          items={[
            <>To share your results with others, copy the URL in the browser address bar and send it via email or text.</>,
            <>The network URL contains a unique code that allows access to your results. There is no way to access your results without its URL.</>,
            <>Anyone with the URL will be able to see your results and make changes to the network layout.</>,
          ]}
        />
      </>,
    },
    {
      question: <>How is my data stored?</>,
      answer: <>
        <UnorderedList
          items={[
            <>
              Your query parameters and the resulting analysis data is stored on our servers. We will not share this data with anyone, 
              and there is nothing connecting the data with your personal information. 
              The data will be shared over time to make it conveniently accessible to you, but older results may be deleted 
              if we need to free space for new analyses.
            </>,
            <>
              We use industry-standard technology to protect the security of the app and user data.
            </>,
            <>
              Your data is private by default. Others can access your data or results only if you share the URL with them.
            </>,
          ]}
        />
      </>,
    },
    {
      question: <>Can I import my network into Cytoscape?</>,
      answer: <>
        Yes, you first need to download and install <LinkOut href="https://cytoscape.org/download.html">Cytoscape</LinkOut> and then
        install the <LinkOut href="https://apps.cytoscape.org/apps/iregulon">iRegulon App</LinkOut> for Cytoscape.<br />
        You can find the instructions in the <code>README</code> file&mdash;included when you download the network images and data.
      </>,
    },
  ],
];


const useStyles =  makeStyles((theme) => ({
  root: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: theme.spacing(4),
    overflow: 'hidden',
    listStyle: 'none',
    lineHeight: '1.5rem',
    maxWidth: 'none',
    margin: 0,
    padding: 0,
    [theme.breakpoints.down('md')]: {
      gridTemplateColumns: 'repeat(1, minmax(0, 1fr))',
      gap: 0,
    },
  },
  column: {
    listStyle: 'none',
    paddingInlineStart: 0,
  },
  entry: {
    marginTop: theme.spacing(4),
    marginBottom: theme.spacing(4),
    [theme.breakpoints.down('md')]: {
      marginBottom: 0,
    },
  },
  question: {
    fontWeight: 'bold',
    marginBottom: theme.spacing(2),
  },
}));

export function Faq() {
  const classes = useStyles();

  return (
    <ul role="list" className={classes.root}>
    {faqs.map((column, columnIndex) => (
      <li key={columnIndex}>
        <ul role="list" className={classes.column}>
        {column.map((faq, faqIndex) => (
          <li key={faqIndex} className={classes.entry}>
            <Typography component="h3" variant="subtitle1" color="textPrimary" className={classes.question}>
              { faq.question }
            </Typography>
            <Typography component="div" variant="body2" color="textSecondary">
              { faq.answer }
            </Typography>
          </li>
        ))}
        </ul>
      </li>
    ))}
    </ul>
  );
}

function UnorderedList({ items }) {
  return (
    <ul style={{ marginTop: '0.5rem', marginBottom: '0.5rem' }}>
      { items.map((item, idx) => <li key={idx}>{item}</li>) }
    </ul>
  );
}
UnorderedList.propTypes = {
  items: PropTypes.array.isRequired,
};

export default Faq;