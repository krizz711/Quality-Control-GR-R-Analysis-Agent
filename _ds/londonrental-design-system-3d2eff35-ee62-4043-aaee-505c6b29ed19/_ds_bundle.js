/* @ds-bundle: {"format":3,"namespace":"LondonRentalDesignSystem_3d2eff","components":[{"name":"Badge","sourcePath":"components/core/Badge.jsx"},{"name":"Button","sourcePath":"components/core/Button.jsx"},{"name":"Card","sourcePath":"components/core/Card.jsx"},{"name":"SectionTag","sourcePath":"components/core/SectionTag.jsx"},{"name":"Stat","sourcePath":"components/core/Stat.jsx"},{"name":"FilterChip","sourcePath":"components/forms/FilterChip.jsx"},{"name":"Input","sourcePath":"components/forms/Input.jsx"},{"name":"Select","sourcePath":"components/forms/Select.jsx"},{"name":"Switch","sourcePath":"components/forms/Switch.jsx"},{"name":"ListingCard","sourcePath":"components/listings/ListingCard.jsx"},{"name":"Dialog","sourcePath":"components/overlay/Dialog.jsx"},{"name":"StepIndicator","sourcePath":"components/overlay/StepIndicator.jsx"}],"sourceHashes":{"components/core/Badge.jsx":"1f126193293f","components/core/Button.jsx":"9e6da6f181d6","components/core/Card.jsx":"0307ef7715a2","components/core/SectionTag.jsx":"04b606305e13","components/core/Stat.jsx":"316a097c9ba8","components/forms/FilterChip.jsx":"09929eb5bb42","components/forms/Input.jsx":"6bd1368e651f","components/forms/Select.jsx":"122d7445c8b6","components/forms/Switch.jsx":"ca74d10ea1d2","components/listings/ListingCard.jsx":"2f01b9285861","components/overlay/Dialog.jsx":"a0e4e47258bd","components/overlay/StepIndicator.jsx":"695505c004a0","ui_kits/website/AboutSection.jsx":"0b5d6acf4eb7","ui_kits/website/AdminPanel.jsx":"a270a0b0064f","ui_kits/website/Footer.jsx":"f063d89ca00e","ui_kits/website/Hero.jsx":"3b977708c7d4","ui_kits/website/InquiryModal.jsx":"9b085b725901","ui_kits/website/LandlordModal.jsx":"a99da046a9e7","ui_kits/website/ListingsSection.jsx":"62553b098e94","ui_kits/website/Navbar.jsx":"672c4f1793ff","ui_kits/website/WhyUs.jsx":"5fbf587fa4ec"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.LondonRentalDesignSystem_3d2eff = window.LondonRentalDesignSystem_3d2eff || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/core/Badge.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Small status / category pill. Tones: gold, available (green), rented (red),
 * neutral (glass), and listing types (house/apartment/condo/townhome).
 */
function Badge({
  children,
  tone = "neutral",
  solid = false,
  style,
  ...rest
}) {
  const tones = {
    neutral: {
      bg: "var(--surface-glass-hover)",
      fg: "var(--text-secondary)",
      bd: "var(--border-soft)"
    },
    gold: {
      bg: "var(--surface-gold-wash)",
      fg: "var(--gold-500)",
      bd: "var(--border-gold)"
    },
    available: {
      bg: "var(--surface-green-wash)",
      fg: "var(--green-300)",
      bd: "rgba(26,122,74,0.3)"
    },
    rented: {
      bg: "var(--surface-red-wash)",
      fg: "var(--red-300)",
      bd: "rgba(192,57,43,0.3)"
    },
    house: {
      bg: "var(--type-house)",
      fg: "var(--navy-600)",
      bd: "transparent"
    },
    apartment: {
      bg: "var(--type-apartment)",
      fg: "var(--navy-600)",
      bd: "transparent"
    },
    condo: {
      bg: "var(--type-condo)",
      fg: "var(--white)",
      bd: "transparent"
    },
    townhome: {
      bg: "var(--type-townhome)",
      fg: "var(--navy-600)",
      bd: "transparent"
    }
  };
  const t = tones[tone] || tones.neutral;
  // Solid status pills (RENTED tag on cards) use a stronger fill.
  const solidMap = {
    rented: {
      bg: "var(--red-500)",
      fg: "var(--white)"
    },
    available: {
      bg: "var(--green-500)",
      fg: "var(--white)"
    },
    gold: {
      bg: "var(--gold-500)",
      fg: "var(--navy-600)"
    }
  };
  const s = solid && solidMap[tone] ? solidMap[tone] : {
    bg: t.bg,
    fg: t.fg
  };
  return /*#__PURE__*/React.createElement("span", _extends({
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 5,
      padding: "4px 12px",
      borderRadius: "var(--radius-pill)",
      fontSize: 11,
      fontWeight: 700,
      letterSpacing: "var(--tracking-wider)",
      textTransform: "uppercase",
      background: s.bg,
      color: s.fg,
      border: solid ? "none" : `1px solid ${t.bd}`,
      fontFamily: "var(--font-sans)",
      ...style
    }
  }, rest), children);
}
Object.assign(__ds_scope, { Badge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Badge.jsx", error: String((e && e.message) || e) }); }

// components/core/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * LondonRental primary button.
 * Variants: "gold" (gradient fill, navy text) · "outline" (gold border, inverts on hover) · "ghost" (subtle glass).
 * Sizes: "sm" | "md" | "lg".
 */
function Button({
  children,
  variant = "gold",
  size = "md",
  disabled = false,
  full = false,
  loading = false,
  onClick,
  style,
  ...rest
}) {
  const sizes = {
    sm: {
      padding: "9px 22px",
      fontSize: 13
    },
    md: {
      padding: "14px 32px",
      fontSize: 15
    },
    lg: {
      padding: "16px 40px",
      fontSize: 16
    }
  };
  const base = {
    fontFamily: "var(--font-sans)",
    fontWeight: 600,
    letterSpacing: "var(--tracking-wide)",
    borderRadius: "var(--radius-xs)",
    cursor: disabled || loading ? "not-allowed" : "pointer",
    border: "none",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    width: full ? "100%" : "auto",
    opacity: disabled ? 0.5 : 1,
    transition: "transform var(--dur-base) var(--ease-standard), box-shadow var(--dur-base) var(--ease-standard), background var(--dur-base), color var(--dur-base)",
    ...sizes[size]
  };
  const variants = {
    gold: {
      background: "var(--grad-gold)",
      color: "var(--text-on-gold)"
    },
    outline: {
      background: "transparent",
      color: "var(--gold-500)",
      border: "1.5px solid var(--gold-500)"
    },
    ghost: {
      background: "var(--surface-glass-hover)",
      color: "var(--text-primary)",
      border: "1px solid var(--border-soft)"
    }
  };
  const hover = (e, on) => {
    if (disabled || loading) return;
    const el = e.currentTarget;
    if (variant === "gold") {
      el.style.transform = on ? "translateY(-2px)" : "none";
      el.style.boxShadow = on ? "var(--shadow-cta)" : "none";
    } else if (variant === "outline") {
      el.style.transform = on ? "translateY(-2px)" : "none";
      el.style.background = on ? "var(--gold-500)" : "transparent";
      el.style.color = on ? "var(--text-on-gold)" : "var(--gold-500)";
    } else {
      el.style.background = on ? "rgba(255,255,255,0.1)" : "var(--surface-glass-hover)";
    }
  };
  return /*#__PURE__*/React.createElement("button", _extends({
    type: "button",
    disabled: disabled || loading,
    onClick: onClick,
    onMouseEnter: e => hover(e, true),
    onMouseLeave: e => hover(e, false),
    style: {
      ...base,
      ...variants[variant],
      ...style
    }
  }, rest), loading && /*#__PURE__*/React.createElement("span", {
    style: {
      width: 14,
      height: 14,
      border: "2px solid currentColor",
      borderTopColor: "transparent",
      borderRadius: "50%",
      animation: "lr-spin 0.7s linear infinite"
    }
  }), children);
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Button.jsx", error: String((e && e.message) || e) }); }

// components/core/Card.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Glassmorphic surface card. Lifts and warms its border to gold on hover when `hover`.
 * `tone`: "glass" (default) | "gold" (featured wash) | "green" | "red".
 */
function Card({
  children,
  tone = "glass",
  hover = false,
  padding = 24,
  style,
  ...rest
}) {
  const tones = {
    glass: {
      background: "var(--surface-glass)",
      border: "1px solid var(--border-hairline)"
    },
    gold: {
      background: "var(--surface-gold-wash)",
      border: "1px solid var(--border-gold)"
    },
    green: {
      background: "var(--surface-green-wash)",
      border: "1px solid rgba(26,122,74,0.25)"
    },
    red: {
      background: "var(--surface-red-wash)",
      border: "1px solid rgba(192,57,43,0.3)"
    }
  };
  const onHover = (e, on) => {
    if (!hover) return;
    const el = e.currentTarget;
    el.style.transform = on ? "translateY(-4px)" : "none";
    el.style.boxShadow = on ? "var(--shadow-card-hover)" : "none";
    el.style.borderColor = on ? "var(--border-gold-strong)" : "";
  };
  return /*#__PURE__*/React.createElement("div", _extends({
    onMouseEnter: e => onHover(e, true),
    onMouseLeave: e => onHover(e, false),
    style: {
      borderRadius: "var(--radius-lg)",
      padding,
      transition: "transform var(--dur-base) var(--ease-standard), box-shadow var(--dur-base), border-color var(--dur-base)",
      ...tones[tone],
      ...style
    }
  }, rest), children);
}
Object.assign(__ds_scope, { Card });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Card.jsx", error: String((e && e.message) || e) }); }

// components/core/SectionTag.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Uppercase gold eyebrow that precedes section / modal headings.
 * e.g. "FOR LANDLORDS", "AVAILABLE RENTALS".
 */
function SectionTag({
  children,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      fontSize: 11,
      letterSpacing: "var(--tracking-eyebrow)",
      textTransform: "uppercase",
      color: "var(--gold-500)",
      fontWeight: 600,
      fontFamily: "var(--font-sans)",
      ...style
    }
  }, rest), children);
}
Object.assign(__ds_scope, { SectionTag });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/SectionTag.jsx", error: String((e && e.message) || e) }); }

// components/core/Stat.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Big Playfair statistic with a small label beneath — used in the hero stats bar.
 * e.g. "20K+" / "Student Network", "40%" / "of first month's rent".
 */
function Stat({
  value,
  label,
  align = "center",
  size = "md",
  style,
  ...rest
}) {
  const sizes = {
    md: 26,
    lg: 36,
    xl: 64
  };
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      textAlign: align,
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-display)",
      fontWeight: size === "xl" ? 900 : 700,
      fontSize: sizes[size],
      color: "var(--gold-500)",
      lineHeight: 1
    }
  }, value), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: "var(--text-tertiary)",
      letterSpacing: "var(--tracking-wider)",
      marginTop: size === "xl" ? 8 : 2,
      fontFamily: "var(--font-sans)"
    }
  }, label));
}
Object.assign(__ds_scope, { Stat });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Stat.jsx", error: String((e && e.message) || e) }); }

// components/forms/FilterChip.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Rounded filter chip — gold-filled when active, glass when idle. */
function FilterChip({
  children,
  active = false,
  onClick,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("button", _extends({
    type: "button",
    onClick: onClick,
    style: {
      padding: "7px 18px",
      borderRadius: "var(--radius-pill)",
      cursor: "pointer",
      fontSize: 13,
      fontWeight: 500,
      fontFamily: "var(--font-sans)",
      background: active ? "var(--gold-500)" : "var(--surface-glass)",
      color: active ? "var(--navy-600)" : "var(--text-secondary)",
      border: active ? "none" : "1px solid var(--border-soft)",
      transition: "all var(--dur-fast)",
      ...style
    }
  }, rest), children);
}
Object.assign(__ds_scope, { FilterChip });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/FilterChip.jsx", error: String((e && e.message) || e) }); }

// components/forms/Input.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const {
  useState
} = React;
/**
 * Labelled text input on the dark glass surface. Border warms to gold on focus.
 * `as="textarea"` renders a resizable textarea.
 */
function Input({
  label,
  as = "input",
  hint,
  style,
  ...rest
}) {
  const [focus, setFocus] = useState(false);
  const fieldStyle = {
    width: "100%",
    padding: as === "textarea" ? "11px 14px" : "11px 14px",
    background: "var(--surface-glass-hover)",
    border: `1px solid ${focus ? "var(--gold-500)" : "var(--border-input)"}`,
    borderRadius: "var(--radius-sm)",
    color: "var(--text-primary)",
    fontSize: 14,
    outline: "none",
    fontFamily: "var(--font-sans)",
    boxShadow: focus ? "var(--ring-gold)" : "none",
    transition: "border-color var(--dur-fast), box-shadow var(--dur-fast)",
    resize: as === "textarea" ? "vertical" : undefined,
    minHeight: as === "textarea" ? 90 : undefined,
    ...style
  };
  const Field = as;
  return /*#__PURE__*/React.createElement("label", {
    style: {
      display: "block"
    }
  }, label && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12,
      color: "var(--text-muted)",
      letterSpacing: "0.06em",
      textTransform: "uppercase",
      marginBottom: 6,
      display: "block"
    }
  }, label), /*#__PURE__*/React.createElement(Field, _extends({
    onFocus: () => setFocus(true),
    onBlur: () => setFocus(false),
    style: fieldStyle
  }, rest)), hint && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12,
      color: "var(--text-tertiary)",
      marginTop: 6,
      display: "block"
    }
  }, hint));
}
Object.assign(__ds_scope, { Input });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Input.jsx", error: String((e && e.message) || e) }); }

// components/forms/Select.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const {
  useState
} = React;
/** Labelled native select styled to match the dark glass inputs. */
function Select({
  label,
  options = [],
  placeholder,
  style,
  ...rest
}) {
  const [focus, setFocus] = useState(false);
  return /*#__PURE__*/React.createElement("label", {
    style: {
      display: "block"
    }
  }, label && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12,
      color: "var(--text-muted)",
      letterSpacing: "0.06em",
      textTransform: "uppercase",
      marginBottom: 6,
      display: "block"
    }
  }, label), /*#__PURE__*/React.createElement("select", _extends({
    onFocus: () => setFocus(true),
    onBlur: () => setFocus(false),
    style: {
      width: "100%",
      padding: "11px 14px",
      background: "var(--surface-glass-hover)",
      border: `1px solid ${focus ? "var(--gold-500)" : "var(--border-input)"}`,
      borderRadius: "var(--radius-sm)",
      color: "var(--text-primary)",
      fontSize: 14,
      outline: "none",
      fontFamily: "var(--font-sans)",
      appearance: "none",
      boxShadow: focus ? "var(--ring-gold)" : "none",
      transition: "border-color var(--dur-fast), box-shadow var(--dur-fast)",
      ...style
    }
  }, rest), placeholder && /*#__PURE__*/React.createElement("option", {
    value: ""
  }, placeholder), options.map(o => {
    const value = typeof o === "string" ? o : o.value;
    const text = typeof o === "string" ? o : o.label;
    return /*#__PURE__*/React.createElement("option", {
      key: value,
      value: value
    }, text);
  })));
}
Object.assign(__ds_scope, { Select });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Select.jsx", error: String((e && e.message) || e) }); }

// components/forms/Switch.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Gold toggle switch with optional trailing label (e.g. "Pets OK"). */
function Switch({
  checked = false,
  onChange,
  label,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    onClick: () => onChange && onChange(!checked),
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 8,
      cursor: "pointer",
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("div", {
    style: {
      width: 36,
      height: 20,
      borderRadius: "var(--radius-pill)",
      background: checked ? "var(--gold-500)" : "rgba(255,255,255,0.15)",
      position: "relative",
      transition: "background var(--dur-base)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 16,
      height: 16,
      borderRadius: "50%",
      background: "var(--white)",
      position: "absolute",
      top: 2,
      left: checked ? 18 : 2,
      transition: "left var(--dur-base)"
    }
  })), label && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13,
      color: "var(--text-secondary)",
      fontFamily: "var(--font-sans)"
    }
  }, label));
}
Object.assign(__ds_scope, { Switch });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Switch.jsx", error: String((e && e.message) || e) }); }

// components/listings/ListingCard.jsx
try { (() => {
const {
  useState
} = React;
/**
 * Property listing card — image carousel dots, type badge, price, meta row,
 * feature tags, embedded Google map, Details + Inquire actions. Shows a RENTED
 * overlay tag when `listing.status === "rented"`.
 */
function ListingCard({
  listing,
  onInquire,
  onDetails,
  showMap = true
}) {
  const [idx, setIdx] = useState(0);
  const [hover, setHover] = useState(false);
  const l = listing;
  const typeTone = {
    House: "house",
    Apartment: "apartment",
    Condo: "condo",
    Townhome: "townhome"
  }[l.type] || "gold";
  return /*#__PURE__*/React.createElement("div", {
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      background: "var(--surface-glass)",
      border: `1px solid ${hover ? "var(--border-gold-strong)" : "var(--border-hairline)"}`,
      borderRadius: "var(--radius-lg)",
      overflow: "hidden",
      position: "relative",
      transform: hover ? "translateY(-4px)" : "none",
      boxShadow: hover ? "var(--shadow-card-hover)" : "none",
      transition: "transform var(--dur-base), box-shadow var(--dur-base), border-color var(--dur-base)",
      fontFamily: "var(--font-sans)"
    }
  }, l.status === "rented" && /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      top: 14,
      left: 14,
      zIndex: 10
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Badge, {
    tone: "rented",
    solid: true
  }, "Rented")), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      height: 210,
      overflow: "hidden"
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: l.images[idx],
    alt: l.address,
    style: {
      width: "100%",
      height: "100%",
      objectFit: "cover"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      inset: 0,
      background: "linear-gradient(to top, rgba(11,31,58,0.6) 0%, transparent 50%)"
    }
  }), l.images.length > 1 && /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      bottom: 10,
      right: 10,
      display: "flex",
      gap: 5
    }
  }, l.images.map((_, i) => /*#__PURE__*/React.createElement("button", {
    key: i,
    onClick: () => setIdx(i),
    style: {
      width: 6,
      height: 6,
      borderRadius: "50%",
      background: idx === i ? "var(--gold-500)" : "rgba(255,255,255,0.5)",
      border: "none",
      cursor: "pointer",
      padding: 0
    }
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      bottom: 10,
      left: 12
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Badge, {
    tone: typeTone
  }, l.type))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "18px 20px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: 6
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      fontSize: 16,
      marginBottom: 2
    }
  }, l.address), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: "var(--text-muted)"
    }
  }, l.city)), /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "right"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-display)",
      fontWeight: 700,
      fontSize: 20,
      color: "var(--gold-500)"
    }
  }, "$", Number(l.rent).toLocaleString()), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: "var(--text-muted)"
    }
  }, "/month"))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 12,
      margin: "12px 0",
      fontSize: 12,
      color: "var(--text-secondary)"
    }
  }, /*#__PURE__*/React.createElement("span", null, "\uD83D\uDECF ", l.rooms, " bed"), /*#__PURE__*/React.createElement("span", null, "\uD83D\uDEBF ", l.baths, " bath"), /*#__PURE__*/React.createElement("span", null, l.pets ? "🐾 Pets OK" : "🚫 No Pets"), l.parking && /*#__PURE__*/React.createElement("span", null, "\uD83D\uDE97 Parking")), l.description && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: "var(--text-tertiary)",
      lineHeight: 1.6,
      marginBottom: 14
    }
  }, l.description.substring(0, 90), "\u2026"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      marginBottom: 12,
      flexWrap: "wrap"
    }
  }, [l.ac ? "AC" : null, l.laundry, l.heating].filter(Boolean).map(tag => /*#__PURE__*/React.createElement(__ds_scope.Badge, {
    key: tag,
    tone: "neutral",
    style: {
      textTransform: "none",
      fontWeight: 500,
      letterSpacing: 0
    }
  }, tag))), showMap && l.mapQuery && /*#__PURE__*/React.createElement("div", {
    style: {
      borderRadius: "var(--radius-md)",
      overflow: "hidden",
      height: 130,
      marginBottom: 14,
      border: "1px solid var(--border-hairline)"
    }
  }, /*#__PURE__*/React.createElement("iframe", {
    title: `Map for ${l.address}`,
    width: "100%",
    height: "130",
    style: {
      border: 0,
      display: "block"
    },
    src: `https://maps.google.com/maps?q=${l.mapQuery}&output=embed&zoom=15`,
    loading: "lazy"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Button, {
    variant: "ghost",
    size: "sm",
    style: {
      flex: 1
    },
    onClick: () => onDetails && onDetails(l)
  }, "Details"), l.status !== "rented" && /*#__PURE__*/React.createElement(__ds_scope.Button, {
    variant: "gold",
    size: "sm",
    style: {
      flex: 2
    },
    onClick: () => onInquire && onInquire(l)
  }, "Inquire Now \u2192"))));
}
Object.assign(__ds_scope, { ListingCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/listings/ListingCard.jsx", error: String((e && e.message) || e) }); }

// components/overlay/Dialog.jsx
try { (() => {
/**
 * The signature LondonRental modal shell: scrim + blur, gradient navy panel,
 * 3px gold top bar, round close button. Click the scrim to close.
 */
function Dialog({
  children,
  onClose,
  maxWidth = 680,
  eyebrow,
  title,
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    onClick: e => e.target === e.currentTarget && onClose && onClose(),
    style: {
      position: "fixed",
      inset: 0,
      zIndex: 2000,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 20
    }
  }, /*#__PURE__*/React.createElement("div", {
    onClick: onClose,
    style: {
      position: "absolute",
      inset: 0,
      background: "var(--scrim)",
      backdropFilter: "var(--blur-scrim)"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      width: "100%",
      maxWidth,
      background: "linear-gradient(160deg, var(--navy-400) 0%, var(--navy-500) 100%)",
      border: "1px solid var(--border-gold)",
      borderRadius: "var(--radius-lg)",
      maxHeight: "90vh",
      overflowY: "auto",
      boxShadow: "var(--shadow-modal)",
      animation: "lr-fadeInUp 0.4s var(--ease-standard)",
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      height: 3,
      background: "var(--grad-gold-bar)"
    }
  }), onClose && /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    style: {
      position: "absolute",
      top: 20,
      right: 24,
      background: "var(--surface-glass-hover)",
      border: "none",
      color: "var(--text-primary)",
      width: 32,
      height: 32,
      borderRadius: "50%",
      cursor: "pointer",
      fontSize: 18,
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    }
  }, "\u2715"), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "28px 36px 36px"
    }
  }, eyebrow && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      letterSpacing: "var(--tracking-eyebrow)",
      textTransform: "uppercase",
      color: "var(--gold-500)",
      marginBottom: 6,
      fontWeight: 600
    }
  }, eyebrow), title && /*#__PURE__*/React.createElement("h2", {
    style: {
      fontFamily: "var(--font-display)",
      fontSize: 26,
      fontWeight: 700,
      margin: "0 0 20px",
      color: "var(--text-primary)"
    }
  }, title), children)));
}
Object.assign(__ds_scope, { Dialog });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/overlay/Dialog.jsx", error: String((e && e.message) || e) }); }

// components/overlay/StepIndicator.jsx
try { (() => {
/**
 * Numbered step indicator for multi-step flows. Completed steps show a green check,
 * the current step is gold, upcoming steps are muted glass.
 */
function StepIndicator({
  steps = [],
  current = 1,
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 0,
      ...style
    }
  }, steps.map((s, i) => {
    const n = i + 1;
    const done = n < current;
    const active = n === current;
    const bg = done ? "var(--green-500)" : active ? "var(--gold-500)" : "rgba(255,255,255,0.1)";
    const bd = done ? "var(--green-500)" : active ? "var(--gold-500)" : "rgba(255,255,255,0.15)";
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        flex: 1,
        textAlign: "center",
        position: "relative"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 28,
        height: 28,
        borderRadius: "50%",
        margin: "0 auto 6px",
        background: bg,
        border: `2px solid ${bd}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 12,
        fontWeight: 600,
        color: done || active ? "var(--navy-600)" : "var(--text-muted)",
        transition: "all var(--dur-base)"
      }
    }, done ? "✓" : n), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10,
        color: active ? "var(--gold-500)" : "var(--text-muted)",
        letterSpacing: "0.04em"
      }
    }, s), i < steps.length - 1 && /*#__PURE__*/React.createElement("div", {
      style: {
        position: "absolute",
        top: 13,
        left: "55%",
        right: "-45%",
        height: 2,
        background: done ? "var(--green-500)" : "rgba(255,255,255,0.1)",
        zIndex: -1
      }
    }));
  }));
}
Object.assign(__ds_scope, { StepIndicator });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/overlay/StepIndicator.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/AboutSection.jsx
try { (() => {
// LondonRental marketing site — About / Founder (Kunal)
function AboutSection() {
  return /*#__PURE__*/React.createElement("section", {
    id: "about",
    style: {
      background: "var(--navy-400)",
      padding: "80px 40px",
      borderTop: "1px solid rgba(201,146,42,0.08)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 1100,
      margin: "0 auto",
      display: "grid",
      gridTemplateColumns: "minmax(260px, 360px) 1fr",
      gap: 56,
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      inset: "-14px -14px auto auto",
      width: "70%",
      height: "70%",
      border: "1px solid var(--border-gold)",
      borderRadius: "var(--radius-lg)",
      zIndex: 0
    }
  }), /*#__PURE__*/React.createElement("img", {
    src: "../../assets/kunal.jpeg",
    alt: "Kunal Singh Thakur",
    style: {
      position: "relative",
      zIndex: 1,
      width: "100%",
      borderRadius: "var(--radius-lg)",
      display: "block",
      boxShadow: "var(--shadow-modal)"
    }
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(SectionTag, {
    style: {
      marginBottom: 12
    }
  }, "About"), /*#__PURE__*/React.createElement("h2", {
    style: {
      fontFamily: "var(--font-display)",
      fontSize: 42,
      fontWeight: 700,
      margin: "0 0 8px"
    }
  }, "Meet Kunal Singh Thakur"), /*#__PURE__*/React.createElement("div", {
    style: {
      color: "var(--gold-500)",
      fontSize: 15,
      marginBottom: 22,
      letterSpacing: "0.02em"
    }
  }, "Residential Leasing Agent \xB7 London, Ontario"), /*#__PURE__*/React.createElement("p", {
    style: {
      color: "var(--text-secondary)",
      fontSize: 16,
      lineHeight: 1.8,
      marginBottom: 18,
      maxWidth: 560
    }
  }, "I'm a residential leasing agent with over ", /*#__PURE__*/React.createElement("strong", {
    style: {
      color: "var(--white)"
    }
  }, "4 years"), " helping landlords and tenants across London, Ontario. I know this market block by block \u2014 from Westmount and Masonville to the student rentals near Western and Fanshawe."), /*#__PURE__*/React.createElement("p", {
    style: {
      color: "var(--text-secondary)",
      fontSize: 16,
      lineHeight: 1.8,
      marginBottom: 28,
      maxWidth: 560
    }
  }, "LondonRental.ca is my personal commitment to doing rentals the right way: one city, real local reach, and honest, hands-on service. No upfront cost, no spreading thin \u2014 just getting your property rented to the right people, fast."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 40
    }
  }, /*#__PURE__*/React.createElement(Stat, {
    value: "4+ yrs",
    label: "Local Experience",
    align: "left"
  }), /*#__PURE__*/React.createElement(Stat, {
    value: "London",
    label: "Exclusively",
    align: "left"
  }), /*#__PURE__*/React.createElement(Stat, {
    value: "20K+",
    label: "Tenant Network",
    align: "left"
  })))));
}
window.AboutSection = AboutSection;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/AboutSection.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/AdminPanel.jsx
try { (() => {
// LondonRental marketing site — Admin panel (login + listings manager)
const {
  useState: useStateAP
} = React;
function AdminPanel({
  listings,
  onClose,
  onUpdate
}) {
  const [authed, setAuthed] = useStateAP(false);
  const [pw, setPw] = useStateAP("");
  const [error, setError] = useStateAP("");
  const [local, setLocal] = useStateAP(listings);
  const ADMIN_PW = "LondonRental2025";
  const login = () => {
    if (pw === ADMIN_PW) {
      setAuthed(true);
      setError("");
    } else setError("Incorrect password.");
  };
  const toggle = id => {
    const u = local.map(l => l.id === id ? {
      ...l,
      status: l.status === "rented" ? "available" : "rented"
    } : l);
    setLocal(u);
    onUpdate && onUpdate(u);
  };
  const remove = id => {
    const u = local.filter(l => l.id !== id);
    setLocal(u);
    onUpdate && onUpdate(u);
  };
  return /*#__PURE__*/React.createElement(Dialog, {
    eyebrow: "Admin Access",
    title: "Listings Manager",
    onClose: onClose,
    maxWidth: 800
  }, !authed ? /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 340
    }
  }, /*#__PURE__*/React.createElement(Input, {
    label: "Admin Password",
    type: "password",
    placeholder: "Enter password",
    value: pw,
    onChange: e => setPw(e.target.value),
    onKeyDown: e => e.key === "Enter" && login()
  }), error && /*#__PURE__*/React.createElement("div", {
    style: {
      color: "var(--red-300)",
      fontSize: 13,
      marginTop: 8
    }
  }, error), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: "var(--text-muted)",
      marginTop: 10
    }
  }, "Demo password: ", /*#__PURE__*/React.createElement("code", {
    style: {
      color: "var(--gold-500)"
    }
  }, "LondonRental2025")), /*#__PURE__*/React.createElement(Button, {
    variant: "gold",
    full: true,
    style: {
      marginTop: 16
    },
    onClick: login
  }, "Login \u2192")) : /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Card, {
    tone: "green",
    padding: 14,
    style: {
      marginBottom: 16,
      fontSize: 13,
      color: "var(--green-300)"
    }
  }, "\u2713 Logged in as Admin \u2014 ", local.length, " listings total"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: "var(--text-tertiary)"
    }
  }, "Manage availability and remove listings."), /*#__PURE__*/React.createElement(Button, {
    variant: "outline",
    size: "sm"
  }, "+ New Listing")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 12
    }
  }, local.map(l => /*#__PURE__*/React.createElement("div", {
    key: l.id,
    style: {
      display: "flex",
      alignItems: "center",
      gap: 12,
      padding: "12px 14px",
      background: "var(--surface-glass)",
      border: "1px solid var(--border-hairline)",
      borderRadius: "var(--radius-md)"
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: l.images[0],
    alt: "",
    style: {
      width: 56,
      height: 56,
      objectFit: "cover",
      borderRadius: "var(--radius-sm)",
      flexShrink: 0
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      fontSize: 14,
      marginBottom: 2
    }
  }, l.address), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: "var(--text-muted)"
    }
  }, l.type, " \xB7 ", l.rooms, "bd \xB7 $", Number(l.rent).toLocaleString(), "/mo")), /*#__PURE__*/React.createElement(Badge, {
    tone: l.status === "rented" ? "rented" : "available"
  }, l.status === "rented" ? "Rented" : "Available"), /*#__PURE__*/React.createElement(Button, {
    variant: "ghost",
    size: "sm",
    onClick: () => toggle(l.id)
  }, l.status === "rented" ? "Mark Available" : "Mark Rented"), /*#__PURE__*/React.createElement("button", {
    onClick: () => remove(l.id),
    style: {
      background: "var(--surface-red-wash)",
      border: "1px solid rgba(192,57,43,0.3)",
      color: "var(--red-300)",
      padding: "8px 12px",
      borderRadius: "var(--radius-sm)",
      cursor: "pointer",
      fontSize: 12,
      fontFamily: "var(--font-sans)"
    }
  }, "Delete"))))));
}
window.AdminPanel = AdminPanel;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/AdminPanel.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/Footer.jsx
try { (() => {
// LondonRental marketing site — Footer
function Footer({
  onAdmin
}) {
  return /*#__PURE__*/React.createElement("footer", {
    id: "contact",
    style: {
      background: "var(--surface-footer)",
      borderTop: "1px solid rgba(201,146,42,0.1)",
      padding: "60px 40px 30px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 1100,
      margin: "0 auto"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "2fr 1fr 1fr",
      gap: 48,
      marginBottom: 48
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 38,
      height: 38,
      borderRadius: "var(--radius-xs)",
      overflow: "hidden",
      background: "#fff"
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/logo.jpeg",
    alt: "",
    style: {
      width: "100%",
      height: "100%",
      objectFit: "cover",
      transform: "scale(1.7)"
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-display)",
      fontWeight: 700,
      fontSize: 20
    }
  }, "LondonRental.ca")), /*#__PURE__*/React.createElement("p", {
    style: {
      color: "var(--text-tertiary)",
      fontSize: 14,
      lineHeight: 1.8,
      maxWidth: 320
    }
  }, "London Ontario's dedicated rental marketplace. Connecting landlords and tenants with professionalism and care \u2014 one city, done right.")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      marginBottom: 16,
      fontSize: 14
    }
  }, "Quick Links"), ["Browse Listings", "For Landlords", "About Kunal", "Contact Us"].map(l => /*#__PURE__*/React.createElement("div", {
    key: l,
    style: {
      color: "var(--text-tertiary)",
      fontSize: 14,
      marginBottom: 10,
      cursor: "pointer"
    }
  }, l))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      marginBottom: 16,
      fontSize: 14
    }
  }, "Contact"), /*#__PURE__*/React.createElement("div", {
    style: {
      color: "var(--text-tertiary)",
      fontSize: 14,
      marginBottom: 10
    }
  }, "\uD83D\uDCE7 info@londonrental.ca"), /*#__PURE__*/React.createElement("div", {
    style: {
      color: "var(--text-tertiary)",
      fontSize: 14,
      marginBottom: 10
    }
  }, "\uD83D\uDCCD London, Ontario"), /*#__PURE__*/React.createElement("div", {
    style: {
      color: "var(--text-tertiary)",
      fontSize: 14
    }
  }, "\uD83C\uDDE8\uD83C\uDDE6 Canada"))), /*#__PURE__*/React.createElement("div", {
    style: {
      borderTop: "1px solid rgba(255,255,255,0.06)",
      paddingTop: 24,
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      flexWrap: "wrap",
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      color: "rgba(255,255,255,0.25)",
      fontSize: 13
    }
  }, "\xA9 2025 LondonRental.ca \u2014 London, Ontario. All rights reserved."), /*#__PURE__*/React.createElement("button", {
    onClick: onAdmin,
    style: {
      background: "none",
      border: "1px solid rgba(255,255,255,0.08)",
      color: "rgba(255,255,255,0.3)",
      fontSize: 12,
      padding: "6px 14px",
      borderRadius: "var(--radius-sm)",
      cursor: "pointer",
      fontFamily: "var(--font-sans)"
    }
  }, "Admin"))));
}
window.Footer = Footer;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/Footer.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/Hero.jsx
try { (() => {
// LondonRental marketing site — Hero
function Hero({
  onLandlord,
  onListings
}) {
  const tile = active => ({
    cursor: "pointer",
    padding: "28px 44px",
    borderRadius: "var(--radius-md)",
    minWidth: 240,
    transition: "all 0.3s ease"
  });
  return /*#__PURE__*/React.createElement("section", {
    style: {
      minHeight: "100vh",
      position: "relative",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
      padding: "0 40px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      inset: 0,
      background: "var(--grad-hero)"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      inset: 0,
      backgroundImage: "radial-gradient(circle at 20% 50%, rgba(201,146,42,0.08) 0%, transparent 60%), radial-gradient(circle at 80% 20%, rgba(11,31,58,0.6) 0%, transparent 50%)"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      inset: 0,
      backgroundImage: "linear-gradient(rgba(201,146,42,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(201,146,42,0.04) 1px, transparent 1px)",
      backgroundSize: "60px 60px"
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "lr-animate-float",
    style: {
      position: "absolute",
      top: "15%",
      right: "8%",
      width: 220,
      height: 220,
      borderRadius: "50%",
      background: "radial-gradient(circle, rgba(201,146,42,0.12) 0%, transparent 70%)",
      border: "1px solid rgba(201,146,42,0.1)"
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "lr-animate-float",
    style: {
      position: "absolute",
      bottom: "20%",
      left: "5%",
      width: 150,
      height: 150,
      borderRadius: "50%",
      background: "radial-gradient(circle, rgba(26,122,74,0.1) 0%, transparent 70%)",
      animationDelay: "2s"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      zIndex: 2,
      maxWidth: 960,
      textAlign: "center"
    }
  }, /*#__PURE__*/React.createElement(SectionTag, {
    style: {
      marginBottom: 12
    }
  }, "London Ontario's Dedicated Rental Marketplace"), /*#__PURE__*/React.createElement("h1", {
    style: {
      fontFamily: "var(--font-display)",
      fontSize: "clamp(42px, 7vw, 82px)",
      fontWeight: 900,
      lineHeight: 1.05,
      margin: "0 0 24px"
    }
  }, "Find Your Perfect", /*#__PURE__*/React.createElement("br", null), /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--gold-500)",
      position: "relative"
    }
  }, "London Rental", /*#__PURE__*/React.createElement("svg", {
    style: {
      position: "absolute",
      bottom: -6,
      left: 0,
      width: "100%",
      height: 8
    },
    viewBox: "0 0 300 8"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M0 6 Q75 0 150 4 Q225 8 300 2",
    stroke: "var(--gold-500)",
    strokeWidth: "2",
    fill: "none",
    opacity: "0.6"
  })))), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 18,
      color: "var(--text-secondary)",
      maxWidth: 560,
      margin: "0 auto 48px",
      lineHeight: 1.7
    }
  }, "Connecting landlords and tenants across London, Ontario \u2014 with expert leasing support and zero upfront cost to landlords."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 20,
      justifyContent: "center",
      flexWrap: "wrap"
    }
  }, /*#__PURE__*/React.createElement("div", {
    onClick: onListings,
    style: {
      ...tile(),
      background: "var(--grad-gold)"
    },
    onMouseOver: e => {
      e.currentTarget.style.transform = "translateY(-4px)";
      e.currentTarget.style.boxShadow = "var(--shadow-cta-lg)";
    },
    onMouseOut: e => {
      e.currentTarget.style.transform = "none";
      e.currentTarget.style.boxShadow = "none";
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 28,
      marginBottom: 6
    }
  }, "\uD83C\uDFD8\uFE0F"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-display)",
      fontWeight: 700,
      fontSize: 22,
      color: "var(--navy-600)",
      marginBottom: 4
    }
  }, "For Tenants"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: "rgba(11,31,58,0.7)"
    }
  }, "Browse available listings")), /*#__PURE__*/React.createElement("div", {
    onClick: onLandlord,
    style: {
      ...tile(),
      border: "2px solid var(--gold-500)",
      background: "rgba(201,146,42,0.05)"
    },
    onMouseOver: e => {
      e.currentTarget.style.transform = "translateY(-4px)";
      e.currentTarget.style.background = "rgba(201,146,42,0.12)";
      e.currentTarget.style.boxShadow = "var(--shadow-lift)";
    },
    onMouseOut: e => {
      e.currentTarget.style.transform = "none";
      e.currentTarget.style.background = "rgba(201,146,42,0.05)";
      e.currentTarget.style.boxShadow = "none";
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 28,
      marginBottom: 6
    }
  }, "\uD83D\uDD11"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-display)",
      fontWeight: 700,
      fontSize: 22,
      color: "var(--white)",
      marginBottom: 4
    }
  }, "For Landlords"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: "var(--text-tertiary)"
    }
  }, "List your property with us"))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "center",
      gap: 48,
      marginTop: 72,
      paddingTop: 40,
      borderTop: "1px solid rgba(255,255,255,0.06)"
    }
  }, /*#__PURE__*/React.createElement(Stat, {
    value: "20K+",
    label: "Student Network"
  }), /*#__PURE__*/React.createElement(Stat, {
    value: "London",
    label: "Ontario Only"
  }), /*#__PURE__*/React.createElement(Stat, {
    value: "No Upfront",
    label: "Cost to Landlords"
  }))));
}
window.Hero = Hero;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/Hero.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/InquiryModal.jsx
try { (() => {
// LondonRental marketing site — Tenant inquiry modal
const {
  useState: useStateIM
} = React;
function InquiryModal({
  listing,
  onClose
}) {
  const [form, setForm] = useStateIM({
    name: "",
    email: "",
    phone: "",
    people: "1",
    credit: "",
    pets: "No",
    cars: "0",
    lease: "12",
    readyFL: "Yes",
    message: ""
  });
  const [submitting, setSubmitting] = useStateIM(false);
  const [submitted, setSubmitted] = useStateIM(false);
  const fld = (k, v) => setForm(p => ({
    ...p,
    [k]: v
  }));
  const submit = async () => {
    setSubmitting(true);
    await new Promise(r => setTimeout(r, 1200));
    setSubmitting(false);
    setSubmitted(true);
  };
  return /*#__PURE__*/React.createElement(Dialog, {
    eyebrow: "Tenant Inquiry",
    title: listing.address,
    onClose: onClose,
    maxWidth: 560
  }, !submitted ? /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    style: {
      color: "var(--text-tertiary)",
      fontSize: 14,
      lineHeight: 1.7,
      marginBottom: 22
    }
  }, "$", Number(listing.rent).toLocaleString(), "/mo \xB7 ", listing.type, " \xB7 ", listing.rooms, " bed. Tell us about yourself and we'll be in touch."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 14,
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      gridColumn: "1/-1"
    }
  }, /*#__PURE__*/React.createElement(Input, {
    label: "Full Name *",
    placeholder: "Your full name",
    value: form.name,
    onChange: e => fld("name", e.target.value)
  })), /*#__PURE__*/React.createElement(Input, {
    label: "Email *",
    type: "email",
    placeholder: "you@email.com",
    value: form.email,
    onChange: e => fld("email", e.target.value)
  }), /*#__PURE__*/React.createElement(Input, {
    label: "Phone",
    placeholder: "519-555-0100",
    value: form.phone,
    onChange: e => fld("phone", e.target.value)
  }), /*#__PURE__*/React.createElement(Select, {
    label: "Number of People",
    options: ["1", "2", "3", "4", "5+"],
    value: form.people,
    onChange: e => fld("people", e.target.value)
  }), /*#__PURE__*/React.createElement(Select, {
    label: "Credit Score",
    placeholder: "Select range",
    options: ["Below 600", "600–650", "650–700", "700–750", "750–800", "800+"],
    value: form.credit,
    onChange: e => fld("credit", e.target.value)
  }), /*#__PURE__*/React.createElement(Select, {
    label: "Pets?",
    options: ["No", "Yes - Cat", "Yes - Dog", "Yes - Other"],
    value: form.pets,
    onChange: e => fld("pets", e.target.value)
  }), /*#__PURE__*/React.createElement(Select, {
    label: "Number of Cars",
    options: ["0", "1", "2", "3+"],
    value: form.cars,
    onChange: e => fld("cars", e.target.value)
  }), /*#__PURE__*/React.createElement(Select, {
    label: "Lease Length",
    options: ["12 months", "18 months", "24 months", "Month-to-month (after 1yr)"],
    value: form.lease,
    onChange: e => fld("lease", e.target.value)
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12,
      color: "var(--text-muted)",
      letterSpacing: "0.06em",
      textTransform: "uppercase",
      marginBottom: 8,
      display: "block"
    }
  }, "Ready to pay First + Last upfront after signing?"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 10
    }
  }, ["Yes", "No", "Need to Discuss"].map(opt => /*#__PURE__*/React.createElement(FilterChip, {
    key: opt,
    active: form.readyFL === opt,
    onClick: () => fld("readyFL", opt),
    style: {
      flex: 1,
      textAlign: "center"
    }
  }, opt)))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 20
    }
  }, /*#__PURE__*/React.createElement(Input, {
    label: "Message / Additional Info",
    as: "textarea",
    placeholder: "Any questions about the property\u2026",
    value: form.message,
    onChange: e => fld("message", e.target.value)
  })), /*#__PURE__*/React.createElement(Card, {
    tone: "gold",
    padding: 14,
    style: {
      marginBottom: 20,
      fontSize: 13,
      color: "var(--text-secondary)",
      lineHeight: 1.7
    }
  }, "\uD83D\uDCE7 Sent to ", /*#__PURE__*/React.createElement("strong", {
    style: {
      color: "var(--gold-500)"
    }
  }, "info@londonrental.ca"), " with subject: ", /*#__PURE__*/React.createElement("em", null, listing.address)), /*#__PURE__*/React.createElement(Button, {
    variant: "gold",
    full: true,
    loading: submitting,
    onClick: submit
  }, "Send Inquiry \u2192")) : /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "center",
      padding: "24px 0"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 52,
      marginBottom: 16
    }
  }, "\u2705"), /*#__PURE__*/React.createElement("h3", {
    style: {
      fontFamily: "var(--font-display)",
      fontSize: 24,
      marginBottom: 12
    }
  }, "Inquiry Sent!"), /*#__PURE__*/React.createElement("p", {
    style: {
      color: "var(--text-secondary)",
      lineHeight: 1.8,
      fontSize: 15,
      marginBottom: 28
    }
  }, "Your inquiry for ", /*#__PURE__*/React.createElement("strong", {
    style: {
      color: "var(--gold-500)"
    }
  }, listing.address), " has been submitted. We'll be in touch shortly!"), /*#__PURE__*/React.createElement(Button, {
    variant: "gold",
    onClick: onClose
  }, "Close")));
}
window.InquiryModal = InquiryModal;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/InquiryModal.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/LandlordModal.jsx
try { (() => {
// LondonRental marketing site — Landlord multi-step modal
const {
  useState: useStateLL
} = React;
function LandlordModal({
  onClose
}) {
  const [step, setStep] = useStateLL(1);
  const [submitted, setSubmitted] = useStateLL(false);
  const [submitting, setSubmitting] = useStateLL(false);
  const [form, setForm] = useStateLL({
    address: "",
    postalCode: "",
    type: "House",
    bedrooms: "",
    bathrooms: "",
    rent: "",
    pets: "No",
    parking: "No",
    ac: "Yes",
    heating: "Gas",
    laundry: "In-unit",
    furnished: "No",
    description: "",
    conditions: "",
    name: "",
    phone: "",
    email: ""
  });
  const fld = (k, v) => setForm(p => ({
    ...p,
    [k]: v
  }));
  const steps = ["Our Services", "What's Included", "Our Fees", "Submit Property"];
  const submit = async () => {
    setSubmitting(true);
    await new Promise(r => setTimeout(r, 1400));
    setSubmitting(false);
    setSubmitted(true);
  };
  const feature = (icon, title, desc, tone) => /*#__PURE__*/React.createElement("div", {
    key: title,
    style: {
      display: "flex",
      gap: 14,
      marginBottom: 16,
      padding: "14px 18px",
      background: tone === "gold" ? "var(--surface-gold-wash)" : "var(--surface-glass)",
      borderRadius: "var(--radius-md)",
      border: tone === "gold" ? "1px solid var(--border-gold)" : "1px solid var(--border-hairline)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 22,
      flexShrink: 0
    }
  }, icon), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      fontSize: 14,
      marginBottom: 3
    }
  }, title), /*#__PURE__*/React.createElement("div", {
    style: {
      color: "var(--text-tertiary)",
      fontSize: 13,
      lineHeight: 1.6
    }
  }, desc)));
  return /*#__PURE__*/React.createElement(Dialog, {
    eyebrow: "For Landlords",
    title: "Welcome to LondonRental.ca",
    onClose: onClose
  }, !submitted && /*#__PURE__*/React.createElement(StepIndicator, {
    steps: steps,
    current: step,
    style: {
      marginBottom: 32
    }
  }), step === 1 && /*#__PURE__*/React.createElement("div", {
    style: {
      animation: "lr-fadeInUp 0.4s ease"
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      color: "var(--text-secondary)",
      lineHeight: 1.8,
      marginBottom: 24,
      fontSize: 15
    }
  }, "LondonRental.ca is the dedicated rental marketplace for ", /*#__PURE__*/React.createElement("strong", {
    style: {
      color: "var(--gold-500)"
    }
  }, "London, Ontario only"), ". One market means deeper connections, faster results, and truly local service."), feature("📢", "Massive Local Reach", "Full promotion on Kijiji, Facebook Marketplace, and our student groups with 20,000+ members across London.", "gold"), feature("🎯", "London-Focused Only", "100% of our energy goes to London. Your listing gets the attention it deserves."), feature("💼", "Professional Representation", "Quality photos, detailed descriptions, and a fast response to every inquiry."), /*#__PURE__*/React.createElement(Button, {
    variant: "gold",
    full: true,
    style: {
      marginTop: 8
    },
    onClick: () => setStep(2)
  }, "Next: What's Included \u2192")), step === 2 && /*#__PURE__*/React.createElement("div", {
    style: {
      animation: "lr-fadeInUp 0.4s ease"
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      color: "var(--text-secondary)",
      lineHeight: 1.8,
      marginBottom: 24,
      fontSize: 15
    }
  }, "Here's exactly what we handle on your behalf."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 12,
      marginBottom: 24
    }
  }, [["📸", "Property Promotion"], ["📬", "Handling Inquiries"], ["📅", "Scheduling Showings"], ["📁", "Document Collection"]].map(([i, t]) => /*#__PURE__*/React.createElement(Card, {
    key: t,
    tone: "gold",
    padding: 16
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 20,
      display: "block",
      marginBottom: 8
    }
  }, i), /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      fontSize: 14
    }
  }, t)))), /*#__PURE__*/React.createElement(Card, {
    tone: "green",
    padding: 18,
    style: {
      marginBottom: 24
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      color: "var(--green-300)",
      marginBottom: 6,
      fontSize: 15
    }
  }, "\u270B You Stay In Control"), /*#__PURE__*/React.createElement("p", {
    style: {
      color: "var(--text-secondary)",
      fontSize: 14,
      lineHeight: 1.7,
      margin: 0
    }
  }, "Lease signing and rent collection stay with you. You review documents, verify applicants, and collect rent directly.")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 12
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "outline",
    style: {
      flex: 1
    },
    onClick: () => setStep(1)
  }, "\u2190 Back"), /*#__PURE__*/React.createElement(Button, {
    variant: "gold",
    style: {
      flex: 2
    },
    onClick: () => setStep(3)
  }, "Next: Our Fees \u2192"))), step === 3 && /*#__PURE__*/React.createElement("div", {
    style: {
      animation: "lr-fadeInUp 0.4s ease"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "center",
      padding: "12px 0 28px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 64,
      fontFamily: "var(--font-display)",
      fontWeight: 900,
      color: "var(--gold-500)",
      lineHeight: 1
    }
  }, "40%"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 18,
      color: "var(--text-secondary)",
      marginTop: 8
    }
  }, "of first month's rent"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      color: "var(--text-muted)"
    }
  }, "One-time fee after lease is signed")), feature("💵", "No Money Upfront", "You pay nothing until the lease is signed and your property is rented. Zero financial risk."), feature("🔒", "No Hidden Charges", "40% of first month is all you pay. No monthly fees, no renewal fees, ever."), /*#__PURE__*/React.createElement(Card, {
    tone: "gold",
    padding: 16,
    style: {
      marginTop: 8,
      marginBottom: 24,
      fontSize: 14,
      color: "var(--text-secondary)",
      lineHeight: 1.7
    }
  }, "\uD83D\uDCA1 ", /*#__PURE__*/React.createElement("strong", null, "Example:"), " If rent is $1,800/month, our one-time fee after signing is ", /*#__PURE__*/React.createElement("strong", {
    style: {
      color: "var(--gold-500)"
    }
  }, "$720"), ". That's it \u2014 forever."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 12
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "outline",
    style: {
      flex: 1
    },
    onClick: () => setStep(2)
  }, "\u2190 Back"), /*#__PURE__*/React.createElement(Button, {
    variant: "gold",
    style: {
      flex: 2
    },
    onClick: () => setStep(4)
  }, "Submit My Property \u2192"))), step === 4 && !submitted && /*#__PURE__*/React.createElement("div", {
    style: {
      animation: "lr-fadeInUp 0.4s ease"
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      color: "var(--text-tertiary)",
      marginBottom: 22,
      fontSize: 14,
      lineHeight: 1.7
    }
  }, "Fill in your property details. We'll review and contact you within 24 hours."), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      fontWeight: 600,
      color: "var(--gold-500)",
      letterSpacing: "0.08em",
      textTransform: "uppercase",
      marginBottom: 14
    }
  }, "Property Details"), /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement(Input, {
    label: "Street Address *",
    placeholder: "e.g. 245 Commissioners Rd W",
    value: form.address,
    onChange: e => fld("address", e.target.value)
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 14,
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement(Input, {
    label: "Postal Code",
    placeholder: "N6J 1Y4",
    value: form.postalCode,
    onChange: e => fld("postalCode", e.target.value)
  }), /*#__PURE__*/React.createElement(Select, {
    label: "Property Type *",
    options: ["House", "Apartment", "Condo", "Townhome", "Basement", "Studio"],
    value: form.type,
    onChange: e => fld("type", e.target.value)
  }), /*#__PURE__*/React.createElement(Select, {
    label: "Bedrooms *",
    placeholder: "Select",
    options: ["Studio", "1", "2", "3", "4", "5+"],
    value: form.bedrooms,
    onChange: e => fld("bedrooms", e.target.value)
  }), /*#__PURE__*/React.createElement(Select, {
    label: "Bathrooms *",
    placeholder: "Select",
    options: ["1", "1.5", "2", "2.5", "3+"],
    value: form.bathrooms,
    onChange: e => fld("bathrooms", e.target.value)
  }), /*#__PURE__*/React.createElement(Input, {
    label: "Monthly Rent ($) *",
    type: "number",
    placeholder: "1800",
    value: form.rent,
    onChange: e => fld("rent", e.target.value)
  }), /*#__PURE__*/React.createElement(Select, {
    label: "Parking",
    options: ["No", "Yes", "Street"],
    value: form.parking,
    onChange: e => fld("parking", e.target.value)
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement(Input, {
    label: "Property Description",
    as: "textarea",
    placeholder: "Describe your property\u2026",
    value: form.description,
    onChange: e => fld("description", e.target.value)
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 24
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12,
      color: "var(--text-muted)",
      letterSpacing: "0.06em",
      textTransform: "uppercase",
      marginBottom: 6,
      display: "block"
    }
  }, "Property Photos"), /*#__PURE__*/React.createElement("div", {
    style: {
      border: "2px dashed var(--border-gold-strong)",
      borderRadius: "var(--radius-md)",
      padding: 20,
      textAlign: "center",
      color: "var(--text-muted)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 28,
      marginBottom: 8
    }
  }, "\uD83D\uDCF7"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14
    }
  }, "Click to upload photos"))), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      fontWeight: 600,
      color: "var(--gold-500)",
      letterSpacing: "0.08em",
      textTransform: "uppercase",
      marginBottom: 14
    }
  }, "Your Contact Details"), /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement(Input, {
    label: "Full Name *",
    placeholder: "Your full name",
    value: form.name,
    onChange: e => fld("name", e.target.value)
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 14,
      marginBottom: 20
    }
  }, /*#__PURE__*/React.createElement(Input, {
    label: "Phone Number *",
    placeholder: "519-555-0100",
    value: form.phone,
    onChange: e => fld("phone", e.target.value)
  }), /*#__PURE__*/React.createElement(Input, {
    label: "Email Address *",
    type: "email",
    placeholder: "you@email.com",
    value: form.email,
    onChange: e => fld("email", e.target.value)
  })), /*#__PURE__*/React.createElement(Card, {
    tone: "gold",
    padding: 14,
    style: {
      marginBottom: 22,
      fontSize: 13,
      color: "var(--text-secondary)",
      lineHeight: 1.7
    }
  }, "\uD83D\uDCE7 Your submission is sent directly to ", /*#__PURE__*/React.createElement("strong", {
    style: {
      color: "var(--gold-500)"
    }
  }, "info@londonrental.ca"), ". We'll review and contact you within 24 hours."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 12
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "outline",
    style: {
      flex: 1
    },
    onClick: () => setStep(3)
  }, "\u2190 Back"), /*#__PURE__*/React.createElement(Button, {
    variant: "gold",
    style: {
      flex: 2
    },
    loading: submitting,
    onClick: submit
  }, "Submit Property \u2192"))), submitted && /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "center",
      padding: "24px 0",
      animation: "lr-fadeInUp 0.5s ease"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 56,
      marginBottom: 16
    }
  }, "\uD83C\uDF89"), /*#__PURE__*/React.createElement("h3", {
    style: {
      fontFamily: "var(--font-display)",
      fontSize: 24,
      marginBottom: 12
    }
  }, "Property Submitted!"), /*#__PURE__*/React.createElement("p", {
    style: {
      color: "var(--text-secondary)",
      lineHeight: 1.8,
      marginBottom: 28,
      fontSize: 15
    }
  }, "Your details were sent to ", /*#__PURE__*/React.createElement("strong", {
    style: {
      color: "var(--gold-500)"
    }
  }, "info@londonrental.ca"), ".", /*#__PURE__*/React.createElement("br", null), "We'll get back to you within 24 hours."), /*#__PURE__*/React.createElement(Button, {
    variant: "gold",
    onClick: onClose
  }, "Done \u2713")));
}
window.LandlordModal = LandlordModal;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/LandlordModal.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/ListingsSection.jsx
try { (() => {
// LondonRental marketing site — Listings section (filters + grid)
const {
  useState: useStateL
} = React;
const DEMO_LISTINGS = [{
  id: 1,
  address: "245 Commissioners Rd W",
  city: "London, ON N6J 1Y4",
  type: "House",
  rooms: 3,
  baths: 2,
  rent: 2400,
  pets: true,
  parking: true,
  ac: true,
  heating: "Gas",
  laundry: "In-unit",
  status: "available",
  description: "Beautifully updated 3-bed, 2-bath house in sought-after Westmount. Modern kitchen, large backyard, and finished basement.",
  images: ["https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=600&q=80", "https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=600&q=80"],
  mapQuery: "245+Commissioners+Rd+W+London+Ontario",
  available: "July 1, 2025",
  deposit: "First + Last"
}, {
  id: 2,
  address: "88 Oxford St E, Unit 4",
  city: "London, ON N6A 1T3",
  type: "Apartment",
  rooms: 2,
  baths: 1,
  rent: 1650,
  pets: false,
  parking: false,
  ac: true,
  heating: "Electric",
  laundry: "Shared",
  status: "available",
  description: "Bright 2-bed apartment steps from Western University. Updated appliances, large windows, excellent transit access.",
  images: ["https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=600&q=80"],
  mapQuery: "88+Oxford+St+E+London+Ontario",
  available: "Immediately",
  deposit: "First + Last"
}, {
  id: 3,
  address: "1120 Huron St, Unit 12",
  city: "London, ON N5Y 4K8",
  type: "Condo",
  rooms: 1,
  baths: 1,
  rent: 1350,
  pets: false,
  parking: true,
  ac: true,
  heating: "Gas",
  laundry: "In-unit",
  status: "rented",
  description: "Modern 1-bed condo near Masonville Mall. Sleek finishes, in-suite laundry, covered parking included.",
  images: ["https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=600&q=80"],
  mapQuery: "1120+Huron+St+London+Ontario",
  available: "Rented",
  deposit: "First + Last"
}, {
  id: 4,
  address: "375 Sunningdale Rd W",
  city: "London, ON N5X 0B7",
  type: "Townhome",
  rooms: 3,
  baths: 2,
  rent: 2200,
  pets: true,
  parking: true,
  ac: true,
  heating: "Gas",
  laundry: "In-unit",
  status: "available",
  description: "Spacious townhome in North London. Open concept main floor, attached garage, private backyard. Pet-friendly.",
  images: ["https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=600&q=80"],
  mapQuery: "375+Sunningdale+Rd+W+London+Ontario",
  available: "Aug 1, 2025",
  deposit: "First + Last"
}];
function ListingsSection({
  listings,
  onInquire,
  onDetails
}) {
  const [filter, setFilter] = useStateL({
    type: "All",
    rooms: "All",
    maxRent: 3500,
    pets: false
  });
  const data = listings || DEMO_LISTINGS;
  const filtered = data.filter(l => {
    if (filter.type !== "All" && l.type !== filter.type) return false;
    if (filter.rooms !== "All" && l.rooms !== parseInt(filter.rooms)) return false;
    if (l.rent > filter.maxRent) return false;
    if (filter.pets && !l.pets) return false;
    return true;
  });
  return /*#__PURE__*/React.createElement("section", {
    id: "listings",
    style: {
      background: "var(--grad-section)",
      padding: "80px 40px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 1100,
      margin: "0 auto"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 40
    }
  }, /*#__PURE__*/React.createElement(SectionTag, null, "Available Rentals"), /*#__PURE__*/React.createElement("h2", {
    style: {
      fontFamily: "var(--font-display)",
      fontSize: 42,
      fontWeight: 700,
      margin: "8px 0 12px"
    }
  }, "Browse London Listings"), /*#__PURE__*/React.createElement("p", {
    style: {
      color: "var(--text-tertiary)",
      fontSize: 16,
      margin: 0
    }
  }, "All properties exclusively in London, Ontario")), /*#__PURE__*/React.createElement("div", {
    style: {
      background: "var(--surface-glass)",
      border: "1px solid var(--border-hairline)",
      borderRadius: "var(--radius-lg)",
      padding: "20px 24px",
      marginBottom: 36,
      display: "flex",
      flexWrap: "wrap",
      gap: 24,
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: "var(--text-muted)",
      marginBottom: 8,
      letterSpacing: "0.1em",
      textTransform: "uppercase"
    }
  }, "Type"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      flexWrap: "wrap"
    }
  }, ["All", "House", "Apartment", "Condo", "Townhome"].map(t => /*#__PURE__*/React.createElement(FilterChip, {
    key: t,
    active: filter.type === t,
    onClick: () => setFilter(p => ({
      ...p,
      type: t
    }))
  }, t)))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: "var(--text-muted)",
      marginBottom: 8,
      letterSpacing: "0.1em",
      textTransform: "uppercase"
    }
  }, "Bedrooms"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8
    }
  }, ["All", "1", "2", "3"].map(r => /*#__PURE__*/React.createElement(FilterChip, {
    key: r,
    active: filter.rooms === r,
    onClick: () => setFilter(p => ({
      ...p,
      rooms: r
    }))
  }, r === "All" ? "Any" : r + " bed")))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: "var(--text-muted)",
      marginBottom: 8,
      letterSpacing: "0.1em",
      textTransform: "uppercase"
    }
  }, "Max Rent: $", filter.maxRent.toLocaleString(), "/mo"), /*#__PURE__*/React.createElement("input", {
    type: "range",
    min: 800,
    max: 4000,
    step: 50,
    value: filter.maxRent,
    onChange: e => setFilter(p => ({
      ...p,
      maxRent: parseInt(e.target.value)
    })),
    style: {
      width: 160,
      accentColor: "var(--gold-500)"
    }
  })), /*#__PURE__*/React.createElement(Switch, {
    checked: filter.pets,
    onChange: v => setFilter(p => ({
      ...p,
      pets: v
    })),
    label: "Pets OK"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 16,
      fontSize: 13,
      color: "var(--text-muted)"
    }
  }, filtered.length, " listing", filtered.length !== 1 ? "s" : "", " found"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
      gap: 24
    }
  }, filtered.map(l => /*#__PURE__*/React.createElement(ListingCard, {
    key: l.id,
    listing: l,
    onInquire: onInquire,
    onDetails: onDetails
  }))), filtered.length === 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "center",
      padding: "60px 0",
      color: "var(--text-muted)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 40,
      marginBottom: 12
    }
  }, "\uD83D\uDD0D"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 16
    }
  }, "No listings match your filters. Try adjusting the criteria above."))));
}
window.ListingsSection = ListingsSection;
window.DEMO_LISTINGS = DEMO_LISTINGS;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/ListingsSection.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/Navbar.jsx
try { (() => {
// LondonRental marketing site — Navbar
const {
  useState: useStateNav,
  useEffect: useEffectNav
} = React;
function Navbar({
  onSection
}) {
  const [scrolled, setScrolled] = useStateNav(false);
  useEffectNav(() => {
    const h = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", h);
    return () => window.removeEventListener("scroll", h);
  }, []);
  const link = {
    background: "none",
    border: "none",
    color: "var(--text-primary)",
    cursor: "pointer",
    fontSize: 14,
    fontWeight: 500,
    letterSpacing: "0.03em",
    opacity: 0.85,
    fontFamily: "var(--font-sans)",
    transition: "opacity 0.2s"
  };
  return /*#__PURE__*/React.createElement("nav", {
    style: {
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      zIndex: 1000,
      padding: "16px 40px",
      background: scrolled ? "rgba(11,31,58,0.97)" : "transparent",
      backdropFilter: scrolled ? "var(--blur-nav)" : "none",
      borderBottom: scrolled ? "1px solid var(--border-gold)" : "none",
      transition: "all 0.4s ease",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      cursor: "pointer"
    },
    onClick: () => onSection("hero")
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 38,
      height: 38,
      borderRadius: "var(--radius-xs)",
      overflow: "hidden",
      background: "#fff",
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/logo.jpeg",
    alt: "LondonRental",
    style: {
      width: "100%",
      height: "100%",
      objectFit: "cover",
      transform: "scale(1.7)"
    }
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-display)",
      fontWeight: 700,
      fontSize: 18,
      lineHeight: 1,
      color: "var(--white)"
    }
  }, "LondonRental", /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--text-muted)"
    }
  }, ".ca")), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      color: "var(--gold-500)",
      letterSpacing: "0.15em",
      textTransform: "uppercase"
    }
  }, "London, Ontario"))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 32,
      alignItems: "center"
    }
  }, [["Listings", "listings"], ["About", "about"], ["For Landlords", "landlord"], ["Contact", "contact"]].map(([label, sec]) => /*#__PURE__*/React.createElement("button", {
    key: sec,
    onClick: () => onSection(sec),
    style: link,
    onMouseOver: e => e.currentTarget.style.opacity = 1,
    onMouseOut: e => e.currentTarget.style.opacity = 0.85
  }, label)), /*#__PURE__*/React.createElement(Button, {
    variant: "gold",
    size: "sm",
    onClick: () => onSection("landlord")
  }, "List Your Property")));
}
window.Navbar = Navbar;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/Navbar.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/WhyUs.jsx
try { (() => {
// LondonRental marketing site — Why Us
function WhyUs() {
  const items = [["🏙️", "London Only", "We focus exclusively on London, Ontario — deep local expertise, no spreading thin."], ["👥", "20,000+ Network", "Direct access to student housing groups with over 20K active members."], ["💸", "No Upfront Cost", "Landlords pay nothing until their lease is signed. Zero financial risk."], ["⚡", "Fast & Professional", "Quick turnaround, professional listings, responsive handling of every inquiry."]];
  return /*#__PURE__*/React.createElement("section", {
    style: {
      background: "var(--navy-400)",
      padding: "80px 40px",
      borderTop: "1px solid rgba(201,146,42,0.08)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 1100,
      margin: "0 auto",
      textAlign: "center"
    }
  }, /*#__PURE__*/React.createElement(SectionTag, null, "Why LondonRental.ca"), /*#__PURE__*/React.createElement("h2", {
    style: {
      fontFamily: "var(--font-display)",
      fontSize: 40,
      fontWeight: 700,
      margin: "8px 0 48px"
    }
  }, "The London Rental Experts"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
      gap: 24
    }
  }, items.map(([icon, title, desc]) => /*#__PURE__*/React.createElement(Card, {
    key: title,
    tone: "glass",
    hover: true,
    padding: 28
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 36,
      marginBottom: 14
    }
  }, icon), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-display)",
      fontWeight: 700,
      fontSize: 18,
      marginBottom: 10
    }
  }, title), /*#__PURE__*/React.createElement("div", {
    style: {
      color: "var(--text-tertiary)",
      fontSize: 14,
      lineHeight: 1.7
    }
  }, desc))))));
}
window.WhyUs = WhyUs;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/WhyUs.jsx", error: String((e && e.message) || e) }); }

__ds_ns.Badge = __ds_scope.Badge;

__ds_ns.Button = __ds_scope.Button;

__ds_ns.Card = __ds_scope.Card;

__ds_ns.SectionTag = __ds_scope.SectionTag;

__ds_ns.Stat = __ds_scope.Stat;

__ds_ns.FilterChip = __ds_scope.FilterChip;

__ds_ns.Input = __ds_scope.Input;

__ds_ns.Select = __ds_scope.Select;

__ds_ns.Switch = __ds_scope.Switch;

__ds_ns.ListingCard = __ds_scope.ListingCard;

__ds_ns.Dialog = __ds_scope.Dialog;

__ds_ns.StepIndicator = __ds_scope.StepIndicator;

})();
