import React from 'react';
import { Link } from '@mui/material';
import SadFaceIcon from '@mui/icons-material/SentimentVeryDissatisfied';


export const PageNotFound = () => {
  return (
    <div style={{
      display: 'table',
      position: 'absolute',
      top: 0,
      left: 0,
      height: '100%',
      width: '100%',
      textAlign: 'center',
    }}>
      <div style={{
        display: 'table-cell',
        verticalAlign: 'middle',
      }}>
        <div style={{ marginTop: '-12em', marginLeft: 'auto', marginRight: 'auto', padding: '2em' }}>
          <SadFaceIcon sx={{ fontSize: '8em', opacity: 0.12 }} />
          <h1 style={{ fontSize: '2em', opacity: 0.2, marginTop: 0 }}>
            Page Not Found
          </h1>
          <p style={{ fontSize: '1.5em', opacity: 0.5, marginTop: '2em' }}>
            Oops! The page you&apos;re looking for doesn&apos;t exist.
          </p>
          <p style={{ fontSize: '1em', opacity: 0.5 }}>
            Please check the URL or return to the <Link href="/" underline="hover">home page</Link>.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PageNotFound;
