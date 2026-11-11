' ArýtmaCAD -> SAP2000 v24 : .$2k dosyasini SAP2000'de acar ve .sdb olarak kaydeder (SAP2000 API / OAPI).
' Kullanim: bu dosyaya cift tiklayin (klasordeki tum .$2k dosyalari islenir) ya da bir .$2k dosyasini bu dosyanin uzerine surukleyin.
' Gerekli: SAP2000 v24 kurulu ve API kayitli (Kurulum klasorundeki RegisterSAP2000.exe bir kez yonetici olarak calistirilmis olmali).
Option Explicit
Dim fso, klasor, dosyalar, f, helper, sap, m, ret, hedef, sayi
Set fso = CreateObject("Scripting.FileSystemObject")
klasor = fso.GetParentFolderName(WScript.ScriptFullName)
Set dosyalar = CreateObject("System.Collections.ArrayList")
If WScript.Arguments.Count > 0 Then
  For Each f In WScript.Arguments: dosyalar.Add f: Next
Else
  For Each f In fso.GetFolder(klasor).Files
    If LCase(fso.GetExtensionName(f.Path)) = "$2k" Then dosyalar.Add f.Path
  Next
End If
If dosyalar.Count = 0 Then MsgBox "Klasorde .$2k dosyasi yok: " & klasor, 48, "ArýtmaCAD -> SAP2000": WScript.Quit
On Error Resume Next
Set helper = CreateObject("SAP2000v1.Helper")
If Err.Number <> 0 Then MsgBox "SAP2000 API bulunamadi." & vbCrLf & "SAP2000 kurulum klasorundeki RegisterSAP2000.exe'yi yonetici olarak bir kez calistirin.", 16, "ArýtmaCAD -> SAP2000": WScript.Quit
Set sap = helper.CreateObjectProgID("CSI.SAP2000.API.SapObject")
If Err.Number <> 0 Or sap Is Nothing Then MsgBox "SAP2000 baslatilamadi (" & Err.Description & ").", 16, "ArýtmaCAD -> SAP2000": WScript.Quit
On Error GoTo 0
sap.ApplicationStart
Set m = sap.SapModel
sayi = 0
For Each f In dosyalar
  ret = m.File.OpenFile(CStr(f))
  If ret = 0 Then
    hedef = fso.BuildPath(fso.GetParentFolderName(f), fso.GetBaseName(f) & ".sdb")
    ret = m.File.Save(hedef)
    If ret = 0 Then sayi = sayi + 1
  Else
    MsgBox "Acilamadi: " & f, 48, "ArýtmaCAD -> SAP2000"
  End If
Next
MsgBox sayi & " model .sdb olarak kaydedildi ve SAP2000'de acik birakildi." & vbCrLf & "Son model: " & hedef, 64, "ArýtmaCAD -> SAP2000"
