import cityPassLogo from '../../../assets/citypass-logo.svg';

import classes from './BrandLogo.module.css';

type BrandLogoProps = {
  compact?: boolean;
  /** Ancho fijo del logo en px. Sin esto se usa el ancho de BrandLogo.module.css. */
  width?: number;
};

export function BrandLogo({ compact = false, width }: BrandLogoProps) {
  return (
    <div className={`${classes.logoWrapper} ${compact ? classes.compact : ''}`}>
      <img className={classes.logo} src={cityPassLogo} alt="CityPass+" style={width ? { width } : undefined} />
      {!compact && (
        <span className={classes.moduleLabel}>Movilidad Urbana</span>
      )}
    </div>
  );
}
