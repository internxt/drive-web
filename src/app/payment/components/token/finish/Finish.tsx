import { Container } from 'react-bootstrap';
import CheckIcon from '../../../assets/check.svg';
import CancelIcon from '../../../assets/token-icons/cancel.svg';

import './Finish.scss';

function Finish({ error }: { error: unknown }): JSX.Element {
  return (
    <Container className="finish-container-box pay-finish-box">
      {error ? (
        <div className="finish-form">
          <p className="finish-title">Failed</p>
          <div>
            <img src={CancelIcon} alt="Check" style={styles} />
          </div>
          <div>Try again later or contact support</div>
        </div>
      ) : (
        <div className="finish-form">
          <p className="finish-title">Success</p>
          <div>
            <img src={CheckIcon} alt="Check" style={styles} />
          </div>
          <div>Thank you! As soon as we receive your payment we are going to enable your plan.</div>
        </div>
      )}
    </Container>
  );
}

export default Finish;

const styles = {
  width: '99px',
  justifySelf: 'center',
  margin: '10px 0px',
};
