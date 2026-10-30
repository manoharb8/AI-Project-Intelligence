import monogram from '../assets/intelligence-monogram.png';
import './finalPolish.css';
import './referenceFinish.css';

/** One open-silhouette mark shared by the sidebar and workspace selector. */
export default function IntelligenceMark() {
  return <span className="intelligence-brand-symbol intelligence-core-brand intelligence-open-mark" aria-hidden="true">
    <img src={monogram} alt="" width={48} height={48} draggable={false}/>
  </span>;
}
