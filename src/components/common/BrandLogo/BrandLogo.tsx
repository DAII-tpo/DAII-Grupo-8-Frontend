import cityPassLogo from '../../../assets/citypass-logo.svg';

import classes from './BrandLogo.module.css';

type BrandLogoProps = {
  compact?: boolean;
};

export function BrandLogo({ compact = false }: BrandLogoProps) {
  return (
    <div className={`${classes.logoWrapper} ${compact ? classes.compact : ''}`}>
      <img className={classes.logo} src={cityPassLogo} alt="CityPass+" />
      {!compact && (
        <span className={classes.moduleLabel}>Movilidad Urbana</span>
      )}
    </div>
  );
}
