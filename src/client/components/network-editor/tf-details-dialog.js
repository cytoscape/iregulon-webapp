import React from 'react';
import PropTypes from 'prop-types';

import { dbName, motifName, logoPath } from '../util';

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Paper,
  Button,
  Typography,
  Divider,
} from '@mui/material';

import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import SettingsEthernetIcon from '@mui/icons-material/SettingsEthernet';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import CloseIcon from '@mui/icons-material/Close';


/**
 * The `name` property must be the name of a motif or track with the collection name (`nameWithCollection`).
 */
const LogoImage = ({ name }) => {
  const logoImgPath = logoPath(name);

  return (
    <Paper variant="outlined" sx={{ height: '100%', width: '100%', maxWidth: 320, borderRadius: '8px', textAlign: 'left', background: '#ffffff' }}>
      <img
        src={logoImgPath}
        alt={name}
        style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: 8 }}
      />
    </Paper>
  );
};
LogoImage.propTypes = {
  name: PropTypes.string.isRequired,
};

//==[ TFDetailDialog ]================================================================================================

export function TFDetailsDialog({ open, tf, motifOrTrack, isMobile, onClose }) {
  console.log('==> TFDetailsDialog', { tf, motifOrTrack });
  const type = motifOrTrack?.type;
  const geneID = tf?.geneID;
  const species = geneID?.speciesNomenclature;
  const motifOrTrackLabel = type === 'MOTIF' ? 'Motif' : 'Track';

  const motifNameWithDB = (motifNameWithCollection) => motifNameWithCollection && `${motifName(motifNameWithCollection)} (${dbName(motifNameWithCollection)})`;
  const isOrthologousGeneUsed = (tf) => !Number.isNaN(tf.minOrthologousIdentity) && tf.orthologousGeneName != null;

  return (
    <Dialog
      open={open}
      fullScreen={isMobile}
      maxWidth="md"
      scroll='paper'
      onClose={onClose}
    >
      <DialogTitle sx={{ display: 'flex', justifyContent: { sm: 'left', xs: 'center' }, alignItems: 'center' }}>
      {isMobile ? (
        <Typography component="span" sx={{ display: 'flex', alignItems: 'center' }}>
          { geneID?.name }
          <MoreHorizIcon sx={{ mx: 1, color: (theme) => theme.palette.text.disabled }} />
          { motifOrTrack?.name }
        </Typography>
      ) : (
        <Typography component="span">
          Details on relation between <b>{ geneID?.name }</b> and <b>{ motifOrTrack?.name }</b>
        </Typography>
      )}
      </DialogTitle>
      <DialogContent dividers>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <Section
            title={`Enriched ${motifOrTrackLabel}`}
            fields={[
              { label: 'Name', value: motifNameWithDB(motifOrTrack?.nameWithCollection) },
              { label: 'Description', value: motifOrTrack?.description },
              { label: 'NES', value: motifOrTrack?.nes },
            ]}
            logoImage={type === 'MOTIF' ? <LogoImage name={motifOrTrack?.nameWithCollection} /> : null}
            divider
          />
        {tf?.similarMotifName && (
          <Section
            title={`Similar to Motif`}
            fields={[
              { label: 'Name', value: motifNameWithDB(tf?.similarMotifName) },
              { label: 'Description', value: tf?.similarMotifDescription },
              { label: 'Similarity (FDR)', value: typeof tf?.maxMotifSimilarityFDR === 'number' ? tf?.maxMotifSimilarityFDR.toExponential(3) : 'Direct' },
            ]}
            logoImage={tf?.similarMotifName && <LogoImage name={tf?.similarMotifName} />}
            divider
          />
        )}
        {tf && isOrthologousGeneUsed(tf) && (
          <Section
            title="Annotated for Gene"
            fields={[
              { label: 'Name', value: tf?.orthologousGeneName },
              { label: 'Species', value: tf?.orthologousSpecies },
              { label: 'Orthologous Identity', value: tf?.minOrthologousIdentity?.toFixed(2) },
            ]}
            divider
          />
        )}
          <Section
            title={`${tf && isOrthologousGeneUsed(tf) ? 'Orthologous to': 'Annotated for' } Transcription Factor`}
            fields={[
              { label: 'Name', value: geneID?.name },
              { label: 'Species and Nomenclature', value: `${species?.name} (${species?.assembly}), ${species?.nomenclature}` },
            ]}
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button
          variant="outlined"
          color="primary"
          autoFocus
          startIcon={<CloseIcon />} 
          onClick={onClose}
        >
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}
TFDetailsDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  tf: PropTypes.object,
  motifOrTrack: PropTypes.object,
  isMobile: PropTypes.bool,
  onClose: PropTypes.func.isRequired,
};

//==[ GeneTable ]=====================================================================================================

function Section({
  title,
  fields,
  logoImage,
  divider,
}) {
  return (
    <Box
      component="section"
      sx={{
        minWidth: { md: 600, sm: 500 },
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
        pb: 2,
        ...(divider && {
          borderBottom: (theme) => `1px solid ${theme.palette.table.divider}`,
        }),
      }}>
      <Typography variant="h1" sx={{ fontSize: '1rem', fontWeight: 'bold', mb: 1, textAlign: { sm: 'left', xs: 'center' } }}>
        { title }
      </Typography>
      {fields.map((field, i) => (
        <Box key={i} sx={{ display: 'flex', flexDirection: { sm: 'row', xs: 'column' }, justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Typography sx={{ flex: { md: '0 0 33%', sm: '0 0 40%' }, textAlign: { sm: 'right', xs: 'left' }, pr: 2, fontSize: '0.75rem', fontWeight: 'bold' }}>
            { field.label }:
          </Typography>
          <Typography sx={{ flex: '1 1 auto', fontSize: '0.75rem' }}>
            { field.value }
          </Typography>
        </Box>
      ))}
      {logoImage && (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end' }}>
          <Box sx={{ flex: { md: '0 0 33%', sm: '0 0 40%' } }} />
          <Box variant="outlined" sx={{ flex: '1 1 auto', height: '100%', width: '100%' }}>
            { logoImage }
          </Box>
        </Box>
      )}
    </Box>
  );
}
Section.propTypes = {
  title: PropTypes.string.isRequired,
  fields: PropTypes.arrayOf(PropTypes.object).isRequired,
  logoImage: PropTypes.object,
  divider: PropTypes.bool,
};


export default TFDetailsDialog;